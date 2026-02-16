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
	<!-- Modal Overlay -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal-overlay" onclick={handleCancel}>
		<!-- Modal Container -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-container" onclick={(e) => e.stopPropagation()}>
			<!-- Modal Header -->
			<div class="modal-header">
				<div class="header-content">
					<span class="header-icon">
						{$modalStore.mode === 'create' ? '➕' : $modalStore.mode === 'edit' ? '✏️' : $modalStore.mode === 'delete' ? '🗑️' : '👁️'}
					</span>
					<h2 class="header-title">
						{$modalStore.mode} {$modalStore.title}
					</h2>
				</div>
				<button class="close-btn" onclick={handleCancel}>✕</button>
			</div>
			
			<!-- Modal Body -->
			<div class="modal-body">
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="modal-form">
					{#each enrichedFields as field}
						{@const error = errors[field.key]}
						
						<div class="field-group">
							<div class="field-label">
								{field.label}
								{#if field.required}
									<span class="field-required">*</span>
								{/if}
							</div>
							
							{#if field.type === 'text'}
								<input
									type="text"
									class="field-input"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									required={field.required} />
									
							{:else if field.type === 'textarea'}
								<textarea
									class="field-textarea"
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
									class="field-select"
									bind:value={formData[field.key]}
									required={field.required}>
									<option value="">Select {field.label}</option>
									{#each field.options || [] as option}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
								
							{:else if field.type === 'datetime'}
								<input
									type="datetime-local"
									class="field-input"
									value={formData[field.key] ? convertFromEpoch(formData[field.key]) : ''}
									oninput={(e) => {
										formData[field.key] = e.currentTarget.value;
									}}
									required={field.required} />
									
							{:else if field.type === 'number'}
								<input
									type="number"
									class="field-input"
									bind:value={formData[field.key]}
									placeholder={field.placeholder}
									required={field.required} />
							{:else if field.type === 'checkbox'}
								<input
									type="checkbox"
									class="field-input checkbox-input"
									bind:checked={formData[field.key]}
									required={field.required} />
							{/if}
							
							{#if error}
								<p class="field-error">
									<span>⚠</span> {error}
								</p>
							{/if}
							
							{#if field.helpText}
								<p class="field-help">{field.helpText}</p>
							{/if}
						</div>
					{/each}
				</form>
			</div>
			
			<!-- Modal Footer -->
			<div class="modal-footer">
				<button type="button" class="btn btn-cancel" onclick={handleCancel}>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-submit"
					onclick={handleSubmit}
					disabled={isSubmitting}>
					{#if isSubmitting}
						<span class="spinner">⚙️</span>
						<span>Submitting...</span>
					{:else}
						<span>{$modalStore.mode === 'create' ? 'Create' : 'Save'}</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-container {
		/* background: var(--color-bg-secondary); */
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-md);
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		background: #2c2e3373;
		border-bottom: 1px solid var(--color-border-subtle);
		padding: 0 var(--spacing-md);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
	}

	.header-icon {
		font-size: var(--font-size-lg);
	}

	.header-title {
		font-size: var(--font-size-md);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--color-accent-error);
		font-size: var(--font-size-lg);
		cursor: pointer;
		transition: all var(--transition-fast);
		line-height: 1;
	}

	.close-btn:hover {
		transform: scale(1.4);
		color: var(--color-text-primary);
	}

	.modal-body {
		padding: 0 var(--spacing-lg);
		overflow-y: auto;
		max-height: calc(90vh - 180px);
	}

	.modal-form {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.field-group {
		display: flex;
		flex-direction: column;
	}

	.field-label {
		display: block;
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		position: relative;
		left: 4px;
	}

	.field-required {
		color: var(--color-accent-error);
	}

	.field-input,
	.field-textarea,
	.field-select {
		width: 100%;
		background: #2c2e3373;
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		transition: all var(--transition-fast);
	}

	.field-input::placeholder,
	.field-textarea::placeholder {
		color: var(--color-text-dim);
	}

	.field-input:focus,
	.field-textarea:focus,
	.field-select:focus {
		outline: none;
		border-color: #f08d3173;
	}

	.field-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.field-select {
		cursor: pointer;
	}

	.field-error {
		color: var(--color-accent-error);
		font-size: var(--font-size-xs);
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.field-help {
		color: var(--color-text-tertiary);
		font-size: var(--font-size-xs);
	}

	.modal-footer {
		padding: var(--spacing-lg);
		display: flex;
		justify-content: space-between;
		gap: var(--spacing-md);
	}

	.btn {
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all var(--transition-fast);
		border: 1px solid var(--color-border-medium);
	}

	.btn-cancel {
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
	}

	.btn-cancel:hover {
		background: var(--color-bg-hover);
		color: var(--color-text-primary);
	}

	.btn-submit {
		background: var(--color-accent-primary);
	}

	.btn-submit:hover:not(:disabled) {
		background: var(--color-accent-secondary);
		border-color: var(--color-accent-secondary);
	}

	.btn-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Custom scrollbar */
	.modal-body::-webkit-scrollbar {
		width: 8px;
	}

	.modal-body::-webkit-scrollbar-track {
		background: var(--color-bg-primary);
	}

	.modal-body::-webkit-scrollbar-thumb {
		background: var(--color-border-strong);
		border-radius: var(--border-radius-sm);
	}

	.modal-body::-webkit-scrollbar-thumb:hover {
		background: var(--color-text-dim);
	}

	/* Datetime input styling */
	input[type="datetime-local"]::-webkit-calendar-picker-indicator {
		filter: invert(0.7);
		cursor: pointer;
	}
</style>