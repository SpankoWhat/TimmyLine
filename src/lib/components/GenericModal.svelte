<script lang="ts">
	import { modalStore, getHandler, validateFormData, submitFormData } from '$lib/modals/ModalRegistry';
	import type { FieldConfig } from '$lib/config/modalFields';
	import { emitEditingRowStatus, emitIdle } from '$lib/stores/collabStore';
	import JsonKeyValueEditor from './JsonKeyValueEditor.svelte';
	import { knownJsonKeys } from '$lib/stores/cacheStore';
	
	let formData = $state<Record<string, any>>({});
	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);
	let editingRowUuid: string | null = null;

	let currentModal = $derived($modalStore);
	
	// Initialize formData keys and defaults values by passing in currentModal.entityType 
	// by dynamically deciding based on the currentModal mode (create/edit)
	$effect(() => {
		if (currentModal?.isOpen) {
			const handler = getHandler(currentModal.entityType);
			const fields = handler.fields;
			const newFormData: Record<string, any> = {};
			
			fields.forEach(field => {
				if (currentModal.mode === 'edit' && currentModal.data) {
					newFormData[field.key] = currentModal.data[field.key];
				} else {
					newFormData[field.key] = field.defaultValue ?? '';
				}
			});
			
			// Preserve uuid for edit mode (not in field configs but needed for API)
			if (currentModal.mode === 'edit' && currentModal.data?.uuid) {
				newFormData.uuid = currentModal.data.uuid;
			}
			
			formData = newFormData;
			
			// Emit editing presence if we have a UUID
			if (currentModal.mode === 'edit' && currentModal.data?.uuid) {
				editingRowUuid = currentModal.data.uuid;
				if (editingRowUuid) {
					emitEditingRowStatus(editingRowUuid, true);
				}
			}
		} else if (editingRowUuid) {
			emitEditingRowStatus(editingRowUuid, false);
			editingRowUuid = null;
		}
	});
	
	// Get enriched fields from the handler (with dropdown options populated)
	let enrichedFields = $derived.by(() => {
		if (!currentModal?.isOpen) return [];
		
		const handler = getHandler(currentModal.entityType);
		return handler.getEnrichedFields() as FieldConfig[];
	});
	
	async function handleSubmit() {
		const currentModal = $modalStore;
		if (!currentModal) return;
		
		const validationErrors = validateFormData(
			currentModal.entityType,
			formData
		);
		
		if (validationErrors) {
			errors = validationErrors;
			return;
		}
		
		errors = {};
		
		// Submit using ModalRegistry
		isSubmitting = true;
		try {
			await submitFormData(
				currentModal.entityType,
				currentModal.mode,
				formData
			);
			
			// Emit idle before closing (successful submission)
			if (editingRowUuid) {
				emitIdle();
				editingRowUuid = null;
			}
			
			modalStore.close();
		} catch (error) {
			console.error('Form submission error:', error);
		} finally {
			isSubmitting = false;
		}
	}
	
	function handleCancel() {
		if (currentModal?.onCancel) {
			currentModal.onCancel();
		}
		// Emit idle before closing
		if (editingRowUuid) {
			emitIdle();
			editingRowUuid = null;
		}
		modalStore.close();
	}
	
	function convertFromEpoch(epochTime: number): string {
		if (!epochTime) return '';
		const date = new Date(epochTime);
		// Format as YYYY-MM-DDTHH:mm for datetime-local input
		return date.toISOString().slice(0, 16);
	}
</script>

{#if $modalStore}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-backdrop" onclick={handleCancel}>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<header class="modal-header">
				<h2 class="modal-title">
					{$modalStore.mode} {$modalStore.title}
				</h2>
				<button
					type="button"
					class="btn-icon"
					aria-label="Close modal"
					onclick={handleCancel}
				>
					<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
						<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</button>
			</header>

			<div class="modal-body">
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					{#each enrichedFields as field (field.key)}
						{@const error = errors[field.key]}

						<div class="field">
							<label class="label" for="field-{field.key}">
								{field.label}
								{#if field.required}
									<span class="field-required" aria-hidden="true">*</span>
								{/if}
							</label>

							{#if field.type === 'text'}
								<input
									id="field-{field.key}"
									type="text"
									class="input"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									required={field.required} />

							{:else if field.type === 'textarea'}
								<textarea
									id="field-{field.key}"
									class="input textarea"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									rows="4"
									required={field.required}></textarea>

							{:else if field.type === 'json'}
								{@const jsonType = currentModal?.entityType === 'timeline_event' ? 'event' : 'action'}
								<JsonKeyValueEditor
									value={formData[field.key] ?? ''}
									knownKeys={$knownJsonKeys[jsonType]}
									placeholder={field.placeholder}
									onchange={(v) => { formData[field.key] = v; }}
								/>

							{:else if field.type === 'select'}
								<select
									id="field-{field.key}"
									class="input select"
									bind:value={formData[field.key]}
									required={field.required}>
									<option value="">Select {field.label}</option>
									{#each field.options || [] as option (option.value)}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>

							{:else if field.type === 'datetime'}
								<input
									id="field-{field.key}"
									type="datetime-local"
									class="input"
									value={formData[field.key] ? convertFromEpoch(formData[field.key]) : ''}
									oninput={(e) => {
										formData[field.key] = e.currentTarget.value;
									}}
									required={field.required} />

							{:else if field.type === 'number'}
								<input
									id="field-{field.key}"
									type="number"
									class="input"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									required={field.required} />

							{:else if field.type === 'checkbox'}
								<div class="checkbox-row">
									<input
										id="field-{field.key}"
										type="checkbox"
										class="checkbox"
										bind:checked={formData[field.key]}
										required={field.required} />
									<!-- label already rendered above -->
								</div>
							{/if}

							{#if error}
								<p class="field-error" role="alert">
									{error}
								</p>
							{/if}

							{#if field.helpText}
								<p class="field-hint">{field.helpText}</p>
							{/if}
						</div>
					{/each}
				</form>
			</div>

			<footer class="modal-footer">
				<button type="button" class="btn-secondary" onclick={handleCancel}>
					Cancel
				</button>
				<button
					type="submit"
					class="btn-primary"
					onclick={handleSubmit}
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<span class="spinner" aria-hidden="true">
							<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
								<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/>
							</svg>
						</span>
						<span>Submitting...</span>
					{:else}
						<span>{$modalStore.mode === 'create' ? 'Create' : 'Save'}</span>
					{/if}
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	/* ── Backdrop ── */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: hsl(0 0% 0% / 0.65);
		z-index: var(--z-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-8);
	}

	/* ── Modal container ── */
	.modal {
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-overlay));
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		max-width: 560px;
		width: 100%;
		max-height: 85vh;
		overflow-y: auto;
		z-index: var(--z-modal);
		box-shadow: var(--shadow-overlay);
		display: flex;
		flex-direction: column;
	}

	/* ── Header ── */
	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-4);
	}

	.modal-title {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		text-transform: capitalize;
		margin: 0;
	}

	/* ── Close button (btn-icon pattern) ── */
	.btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		color: hsl(var(--fg-lighter));
		background: transparent;
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
		flex-shrink: 0;
	}
	.btn-icon:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}
	.btn-icon:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	/* ── Body ── */
	.modal-body {
		overflow-y: auto;
		color: hsl(var(--fg-light));
		font-size: var(--text-sm);
		line-height: var(--leading-normal);
	}

	/* ── Field group ── */
	.field {
		display: flex;
		flex-direction: column;
	}
	.field + .field {
		margin-top: var(--space-3);
	}

	/* ── Label ── */
	.label {
		display: block;
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		margin-bottom: var(--space-1);
	}

	.field-required {
		color: hsl(var(--destructive-default));
	}

	/* ── Inputs (text, textarea, select, datetime, number) ── */
	.input {
		width: 100%;
		padding: var(--space-1\.5) var(--space-2);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-normal);
		line-height: var(--leading-normal);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-control));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-md);
		transition: var(--transition-colors);
		min-height: 32px;
	}
	.input::placeholder {
		color: hsl(var(--fg-lighter));
	}
	.input:focus {
		outline: none;
		border-color: hsl(var(--border-focus));
		box-shadow: 0 0 0 1px hsl(var(--border-focus));
	}
	.input:focus-visible {
		outline: none;
		border-color: hsl(var(--border-focus));
		box-shadow: 0 0 0 1px hsl(var(--border-focus));
	}
	.input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		background: hsl(var(--bg-muted));
	}

	/* ── Textarea ── */
	.textarea {
		resize: vertical;
		min-height: 80px;
		font-family: var(--font-mono);
	}

	/* ── Select ── */
	.select {
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%237d7672' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right var(--space-2) center;
		background-size: 14px;
		padding-right: var(--space-8);
	}

	/* ── Checkbox ── */
	.checkbox-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 32px;
	}
	.checkbox {
		width: 16px;
		height: 16px;
		accent-color: hsl(var(--brand-default));
		cursor: pointer;
	}
	.checkbox:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	/* ── Validation error ── */
	.field-error {
		font-size: var(--text-xs);
		color: hsl(var(--destructive-default));
		margin-top: var(--space-1);
	}

	/* ── Help text ── */
	.field-hint {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		margin-top: var(--space-1);
	}

	/* ── Footer ── */
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-3);
		margin-top: var(--space-6);
	}

	/* ── Secondary button (Cancel) ── */
	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		min-height: 32px;
		white-space: nowrap;
	}
	.btn-secondary:hover {
		background: hsl(var(--bg-surface-300));
		border-color: hsl(var(--border-strong));
	}
	.btn-secondary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}
	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ── Primary button (Submit) ── */
	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-contrast));
		background: hsl(var(--brand-default));
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		min-height: 32px;
		white-space: nowrap;
	}
	.btn-primary:hover {
		background: hsl(var(--brand-600));
	}
	.btn-primary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ── Spinner ── */
	.spinner {
		display: inline-flex;
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* ── Scrollbar ── */
	.modal::-webkit-scrollbar {
		width: 6px;
	}
	.modal::-webkit-scrollbar-track {
		background: transparent;
	}
	.modal::-webkit-scrollbar-thumb {
		background: hsl(var(--border-strong));
		border-radius: var(--radius-full);
	}
	.modal::-webkit-scrollbar-thumb:hover {
		background: hsl(var(--fg-muted));
	}

	/* ── Datetime picker indicator ── */
	input[type="datetime-local"]::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}

	/* ── Reduced motion ── */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 0.01ms !important;
		}
	}
</style>