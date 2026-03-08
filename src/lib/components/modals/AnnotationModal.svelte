<script lang="ts">
	import { get } from 'svelte/store';
	import {
		annotationTypes,
		currentSelectedIncident,
		currentSelectedAnalyst
	} from '$lib/stores/cacheStore';
	import { emitEditingRowStatus, emitIdle } from '$lib/stores/collabStore';

	interface Props {
		mode: 'create' | 'edit';
		data?: any;
		onclose: () => void;
		onsave: () => void;
	}

	let { mode, data, onclose, onsave }: Props = $props();

	// ── Form state ──
	let annotationType = $state('');
	let content = $state('');
	let confidence = $state('');
	let isHypothesis = $state(false);
	let refersTo = $state('');
	let tags = $state('');

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	// ── Edit presence tracking ──
	let editingRowUuid: string | null = null;

	// Sync form state from data prop (handles create vs edit)
	$effect(() => {
		annotationType = data?.annotation_type ?? '';
		content = data?.content ?? '';
		confidence = data?.confidence ?? '';
		isHypothesis = data?.is_hypothesis ?? false;
		refersTo = data?.refers_to ?? '';
		tags = data?.tags ?? '';

		// Emit editing presence if editing an existing row
		if (mode === 'edit' && data?.uuid) {
			editingRowUuid = data.uuid;
			emitEditingRowStatus(editingRowUuid, true);
		}

		return () => {
			if (editingRowUuid) {
				emitEditingRowStatus(editingRowUuid, false);
				editingRowUuid = null;
			}
		};
	});

	// ── Dropdown options from store ──
	let typeOptions = $derived(
		$annotationTypes.map((t) => ({ value: t.name, label: t.name }))
	);

	const confidenceOptions = [
		{ value: 'high', label: 'High' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'low', label: 'Low' },
		{ value: 'guess', label: 'Guess' }
	];

	// ── Validation ──
	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!annotationType) {
			newErrors.annotation_type = 'Annotation type is required';
		}
		if (!content.trim()) {
			newErrors.content = 'Content is required';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	// ── Submit ──
	async function handleSubmit() {
		if (!validate()) return;

		isSubmitting = true;

		const incident = get(currentSelectedIncident);
		const analyst = get(currentSelectedAnalyst);

		const payload: Record<string, any> = {
			annotation_type: annotationType,
			content: content.trim(),
			confidence: confidence || null,
			is_hypothesis: isHypothesis,
			refers_to: refersTo.trim() || null,
			tags: tags.trim() || null,
			incident_id: incident?.uuid ?? null,
			noted_by: analyst?.uuid ?? null
		};

		if (mode === 'edit' && data?.uuid) {
			payload.uuid = data.uuid;
		}

		const endpoint =
			mode === 'create'
				? '/api/create/core/annotation'
				: '/api/update/core/annotation';

		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const msg = body?.message ?? `Server error (${res.status})`;
				errors = { _form: msg };
				return;
			}

			// Success – emit idle and notify parent
			if (editingRowUuid) {
				emitIdle();
				editingRowUuid = null;
			}

			onsave();
		} catch (err) {
			console.error('Annotation submit error:', err);
			errors = { _form: 'Network error — please try again' };
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		if (editingRowUuid) {
			emitIdle();
			editingRowUuid = null;
		}
		onclose();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={handleCancel}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2 class="modal-title">
				{mode === 'create' ? 'Create' : 'Edit'} Annotation
			</h2>
			<button
				type="button"
				class="btn-icon"
				aria-label="Close modal"
				onclick={handleCancel}
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path
						d="M1 1L13 13M13 1L1 13"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</header>

		<div class="modal-body">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				<!-- Annotation Type -->
				<div class="field">
					<label class="label" for="field-annotation_type">
						Annotation Type
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<select
						id="field-annotation_type"
						class="input select"
						bind:value={annotationType}
						required
					>
						<option value="">Select Annotation Type</option>
						{#each typeOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.annotation_type}
						<p class="field-error" role="alert">{errors.annotation_type}</p>
					{/if}
					<p class="field-hint">Max 50 characters</p>
				</div>

				<!-- Content -->
				<div class="field">
					<label class="label" for="field-content">
						Content
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<textarea
						id="field-content"
						class="input textarea"
						bind:value={content}
						placeholder="Add your note or observation"
						rows="4"
						required
					></textarea>
					{#if errors.content}
						<p class="field-error" role="alert">{errors.content}</p>
					{/if}
				</div>

				<!-- Confidence -->
				<div class="field">
					<label class="label" for="field-confidence">
						Confidence
					</label>
					<select
						id="field-confidence"
						class="input select"
						bind:value={confidence}
					>
						<option value="">Select Confidence</option>
						{#each confidenceOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.confidence}
						<p class="field-error" role="alert">{errors.confidence}</p>
					{/if}
				</div>

				<!-- Is Hypothesis -->
				<div class="field">
					<label class="label" for="field-is_hypothesis">
						Is Hypothesis
					</label>
					<div class="checkbox-row">
						<input
							id="field-is_hypothesis"
							type="checkbox"
							class="checkbox"
							bind:checked={isHypothesis}
						/>
					</div>
					{#if errors.is_hypothesis}
						<p class="field-error" role="alert">{errors.is_hypothesis}</p>
					{/if}
				</div>

				<!-- Refers To -->
				<div class="field">
					<label class="label" for="field-refers_to">
						Refers To
					</label>
					<input
						id="field-refers_to"
						type="text"
						class="input"
						bind:value={refersTo}
						placeholder="UUID of related entity (optional)"
					/>
					{#if errors.refers_to}
						<p class="field-error" role="alert">{errors.refers_to}</p>
					{/if}
					<p class="field-hint">Link this annotation to a specific event, action, or entity</p>
				</div>

				<!-- Tags -->
				<div class="field">
					<label class="label" for="field-tags">
						Tags
					</label>
					<input
						id="field-tags"
						type="text"
						class="input"
						bind:value={tags}
						placeholder="Comma-separated tags"
					/>
					{#if errors.tags}
						<p class="field-error" role="alert">{errors.tags}</p>
					{/if}
				</div>

				<!-- Form-level error -->
				{#if errors._form}
					<p class="field-error form-error" role="alert">{errors._form}</p>
				{/if}
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
							<circle
								cx="7"
								cy="7"
								r="6"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-dasharray="28"
								stroke-dashoffset="8"
								stroke-linecap="round"
							/>
						</svg>
					</span>
					<span>Submitting...</span>
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

	/* ── Close button (btn-icon) ── */
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

	/* ── Inputs (text, textarea, select) ── */
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

	/* ── Form-level error ── */
	.form-error {
		margin-top: var(--space-4);
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
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
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
