<script lang="ts">
	import { api, ApiError } from '$lib/client';

	type LookupType = 'action_type' | 'entity_type' | 'event_type' | 'annotation_type';

	interface Props {
		mode: 'create' | 'edit';
		lookupType: LookupType;
		data?: any;
		onclose: () => void;
		onsave: () => void;
	}

	let { mode, lookupType, data, onclose, onsave }: Props = $props();

	let initialName = $derived(data?.name ?? '');
	let initialDescription = $derived(data?.description ?? '');

	let name = $state('');
	let description = $state('');
	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	// Sync state from props when modal opens or data changes
	$effect(() => {
		name = initialName;
		description = initialDescription;
	});

	// Compute labels and placeholders based on lookupType
	let fieldConfig = $derived.by(() => {
		const configs: Record<LookupType, { typeLabel: string; namePlaceholder: string; descPlaceholder: string }> = {
			action_type: {
				typeLabel: 'Action Type',
				namePlaceholder: 'e.g., Analyze Logs, Block IP',
				descPlaceholder: 'Describe this action type'
			},
			entity_type: {
				typeLabel: 'Entity Type',
				namePlaceholder: 'e.g., IP Address, Domain, File Hash',
				descPlaceholder: 'Describe this entity type'
			},
			event_type: {
				typeLabel: 'Event Type',
				namePlaceholder: 'e.g., Port Scan, Malware Detection',
				descPlaceholder: 'Describe this event type'
			},
			annotation_type: {
				typeLabel: 'Annotation Type',
				namePlaceholder: 'e.g., Observation, Hypothesis',
				descPlaceholder: 'Describe this annotation type'
			}
		};
		return configs[lookupType];
	});

	let modalTitle = $derived(
		`${mode === 'create' ? 'Create' : 'Edit'} ${fieldConfig.typeLabel}`
	);

	let nameLabel = $derived(`${fieldConfig.typeLabel} Name`);

	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!name.trim()) {
			newErrors.name = 'Name is required';
		} else if (name.trim().length > 50) {
			newErrors.name = 'Name must be 50 characters or fewer';
		}

		if (description.trim().length > 100) {
			newErrors.description = 'Description must be 100 characters or fewer';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit() {
		if (!validate()) return;

		isSubmitting = true;

		try {
			if (mode === 'create') {
				await api.lookups.create(lookupType, {
					name: name.trim(),
					description: description.trim()
				});
			} else {
				await api.lookups.update(lookupType, {
					old_name: data.name,
					name: name.trim(),
					description: description.trim()
				});
			}

			onsave();
			onclose();
		} catch (err) {
			console.error('Lookup submit error:', err);
			errors = { name: err instanceof ApiError ? err.message : 'An unexpected error occurred' };
		} finally {
			isSubmitting = false;
		}
	}

	function handleBackdropClick() {
		if (!isSubmitting) {
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && !isSubmitting) {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2 class="modal-title">{modalTitle}</h2>
			<button
				type="button"
				class="btn-icon"
				aria-label="Close modal"
				onclick={onclose}
				disabled={isSubmitting}
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</header>

		<div class="modal-body">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<!-- Name field -->
				<div class="field">
					<label class="label" for="lookup-name">
						{nameLabel}
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<input
						id="lookup-name"
						type="text"
						class="input"
						bind:value={name}
						placeholder={fieldConfig.namePlaceholder}
						maxlength={50}
						required
						disabled={isSubmitting}
					/>
					{#if errors.name}
						<p class="field-error" role="alert">{errors.name}</p>
					{/if}
					<p class="field-hint">Max 50 characters — Primary key</p>
				</div>

				<!-- Description field -->
				<div class="field">
					<label class="label" for="lookup-description">
						Description
					</label>
					<textarea
						id="lookup-description"
						class="input textarea"
						bind:value={description}
						placeholder={fieldConfig.descPlaceholder}
						maxlength={100}
						rows="3"
						disabled={isSubmitting}
					></textarea>
					{#if errors.description}
						<p class="field-error" role="alert">{errors.description}</p>
					{/if}
					<p class="field-hint">Max 100 characters</p>
				</div>
			</form>
		</div>

		<footer class="modal-footer">
			<button
				type="button"
				class="btn-secondary"
				onclick={onclose}
				disabled={isSubmitting}
			>
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
					<span>Submitting…</span>
				{:else}
					<span>{mode === 'create' ? 'Create' : 'Save'}</span>
				{/if}
			</button>
		</footer>
	</div>
</div>

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
	.btn-icon:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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

	/* ── Inputs (text, textarea) ── */
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

	/* ── Reduced motion ── */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 0.01ms !important;
		}
	}
</style>
