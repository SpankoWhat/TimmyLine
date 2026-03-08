<script lang="ts">
	import { get } from 'svelte/store';
	import { entityTypes, currentSelectedIncident, currentSelectedAnalyst } from '$lib/stores/cacheStore';
	import { emitEditingRowStatus, emitIdle } from '$lib/stores/collabStore';

	interface Props {
		mode: 'create' | 'edit';
		data?: any;
		onclose: () => void;
		onsave: () => void;
	}

	let { mode, data, onclose, onsave }: Props = $props();

	let entity_type = $state(mode === 'edit' && data?.entity_type ? data.entity_type : '');
	let identifier = $state(mode === 'edit' && data?.identifier ? data.identifier : '');
	let display_name = $state(mode === 'edit' && data?.display_name ? data.display_name : '');
	let status = $state(mode === 'edit' && data?.status ? data.status : 'active');
	let criticality = $state(mode === 'edit' && data?.criticality ? data.criticality : 'unknown');
	let first_seen = $state(mode === 'edit' && data?.first_seen ? convertFromEpoch(data.first_seen) : '');
	let last_seen = $state(mode === 'edit' && data?.last_seen ? convertFromEpoch(data.last_seen) : '');
	let attributes = $state(mode === 'edit' && data?.attributes ? data.attributes : '');
	let tags = $state(mode === 'edit' && data?.tags ? data.tags : '');

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);
	let wasEditing = $state(false);

	const statusOptions = [
		{ value: 'active', label: 'Active' },
		{ value: 'inactive', label: 'Inactive' },
		{ value: 'unknown', label: 'Unknown' }
	];

	const criticalityOptions = [
		{ value: 'critical', label: 'Critical' },
		{ value: 'high', label: 'High' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'low', label: 'Low' },
		{ value: 'unknown', label: 'Unknown' }
	];

	let modalTitle = $derived(mode === 'create' ? 'Create Entity' : 'Edit Entity');
	let submitLabel = $derived(mode === 'create' ? 'Create' : 'Save');

	// Emit editing presence on mount for edit mode
	$effect(() => {
		if (mode === 'edit' && data?.uuid) {
			emitEditingRowStatus(data.uuid, true);
			wasEditing = true;
		}

		return () => {
			if (wasEditing) {
				emitIdle();
			}
		};
	});

	function convertFromEpoch(epochTime: number): string {
		if (!epochTime) return '';
		const date = new Date(epochTime);
		return date.toISOString().slice(0, 16);
	}

	function convertToEpoch(datetimeString: string): number | null {
		if (!datetimeString) return null;
		const date = new Date(datetimeString);
		if (isNaN(date.getTime())) return null;
		return date.getTime();
	}

	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!entity_type) {
			newErrors.entity_type = 'Entity type is required';
		}
		if (!identifier.trim()) {
			newErrors.identifier = 'Identifier is required';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit() {
		if (!validate()) return;

		isSubmitting = true;

		try {
			const incident = get(currentSelectedIncident);
			const analyst = get(currentSelectedAnalyst);

			const payload: Record<string, any> = {
				entity_type,
				identifier: identifier.trim(),
				display_name: display_name.trim() || null,
				status,
				criticality,
				first_seen: convertToEpoch(first_seen),
				last_seen: convertToEpoch(last_seen),
				attributes: attributes.trim() || null,
				tags: tags.trim() || null,
				incident_id: incident?.uuid ?? null,
				entered_by: analyst?.uuid ?? null
			};

			let url: string;

			if (mode === 'create') {
				url = '/api/create/core/entity';
			} else {
				url = '/api/update/core/entity';
				payload.uuid = data?.uuid;
			}

			const response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				throw new Error(errorData?.message ?? `Request failed with status ${response.status}`);
			}

			if (wasEditing) {
				emitIdle();
				wasEditing = false;
			}

			onsave();
		} catch (error) {
			console.error('Entity submission error:', error);
			errors = {
				...errors,
				_form: error instanceof Error ? error.message : 'An unexpected error occurred'
			};
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		if (wasEditing) {
			emitIdle();
			wasEditing = false;
		}
		onclose();
	}

	function handleBackdropClick() {
		handleCancel();
	}

	function handleModalClick(e: MouseEvent) {
		e.stopPropagation();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal" onclick={handleModalClick}>
		<header class="modal-header">
			<h2 class="modal-title">{modalTitle}</h2>
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
				{#if errors._form}
					<div class="form-error" role="alert">
						{errors._form}
					</div>
				{/if}

				<!-- Entity Type -->
				<div class="field">
					<label class="label" for="field-entity_type">
						Entity Type
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<select
						id="field-entity_type"
						class="input select"
						bind:value={entity_type}
						required
					>
						<option value="">Select Entity Type</option>
						{#each $entityTypes as item (item.name)}
							<option value={item.name}>{item.name}</option>
						{/each}
					</select>
					{#if errors.entity_type}
						<p class="field-error" role="alert">{errors.entity_type}</p>
					{/if}
					<p class="field-hint">Max 50 characters</p>
				</div>

				<!-- Identifier -->
				<div class="field">
					<label class="label" for="field-identifier">
						Identifier
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<input
						id="field-identifier"
						type="text"
						class="input"
						bind:value={identifier}
						placeholder="e.g., IP address, hostname, file hash"
						required
					/>
					{#if errors.identifier}
						<p class="field-error" role="alert">{errors.identifier}</p>
					{/if}
					<p class="field-hint">Max 500 characters - Must be unique per incident</p>
				</div>

				<!-- Display Name -->
				<div class="field">
					<label class="label" for="field-display_name">
						Display Name
					</label>
					<input
						id="field-display_name"
						type="text"
						class="input"
						bind:value={display_name}
						placeholder="Human-friendly name for the entity"
					/>
					{#if errors.display_name}
						<p class="field-error" role="alert">{errors.display_name}</p>
					{/if}
					<p class="field-hint">Max 200 characters</p>
				</div>

				<!-- Status -->
				<div class="field">
					<label class="label" for="field-status">
						Status
					</label>
					<select
						id="field-status"
						class="input select"
						bind:value={status}
					>
						<option value="">Select Status</option>
						{#each statusOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.status}
						<p class="field-error" role="alert">{errors.status}</p>
					{/if}
				</div>

				<!-- Criticality -->
				<div class="field">
					<label class="label" for="field-criticality">
						Criticality
					</label>
					<select
						id="field-criticality"
						class="input select"
						bind:value={criticality}
					>
						<option value="">Select Criticality</option>
						{#each criticalityOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.criticality}
						<p class="field-error" role="alert">{errors.criticality}</p>
					{/if}
				</div>

				<!-- First Seen -->
				<div class="field">
					<label class="label" for="field-first_seen">
						First Seen
					</label>
					<input
						id="field-first_seen"
						type="datetime-local"
						class="input"
						bind:value={first_seen}
					/>
					{#if errors.first_seen}
						<p class="field-error" role="alert">{errors.first_seen}</p>
					{/if}
				</div>

				<!-- Last Seen -->
				<div class="field">
					<label class="label" for="field-last_seen">
						Last Seen
					</label>
					<input
						id="field-last_seen"
						type="datetime-local"
						class="input"
						bind:value={last_seen}
					/>
					{#if errors.last_seen}
						<p class="field-error" role="alert">{errors.last_seen}</p>
					{/if}
				</div>

				<!-- Attributes -->
				<div class="field">
					<label class="label" for="field-attributes">
						Attributes
					</label>
					<textarea
						id="field-attributes"
						class="input textarea"
						bind:value={attributes}
						placeholder="JSON format for flexible attributes"
						rows="4"
					></textarea>
					{#if errors.attributes}
						<p class="field-error" role="alert">{errors.attributes}</p>
					{/if}
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
					<span>{submitLabel}</span>
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

	/* ── Form-level error ── */
	.form-error {
		padding: var(--space-2) var(--space-3);
		margin-bottom: var(--space-3);
		font-size: var(--text-sm);
		color: hsl(var(--destructive-default));
		background: hsl(var(--destructive-500) / 0.15);
		border: var(--border-width) solid hsl(var(--destructive-500));
		border-radius: var(--radius-md);
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

	/* ── Inputs (text, textarea, select, datetime) ── */
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
