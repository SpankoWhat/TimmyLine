<script lang="ts">
	import { untrack } from 'svelte';
	import { emitEditingRowStatus, emitIdle } from '$lib/stores/collabStore';

	interface Props {
		mode: 'create' | 'edit';
		data?: any;
		onclose: () => void;
		onsave: () => void;
	}

	let { mode, data, onclose, onsave }: Props = $props();

	// Capture initial data snapshot — modal data does not change after mount
	const initial = untrack(() => data ?? {});
	const rowUuid: string | null = initial.uuid ?? null;

	let title = $state(initial.title ?? '');
	let soar_ticket_id = $state(initial.soar_ticket_id ?? '');
	let priority = $state(initial.priority ?? 'medium');
	let status = $state(initial.status ?? 'In Progress');

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	const priorityOptions = [
		{ value: 'critical', label: 'Critical' },
		{ value: 'high', label: 'High' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'low', label: 'Low' }
	];

	const statusOptions = [
		{ value: 'In Progress', label: 'In Progress' },
		{ value: 'Post-Mortem', label: 'Post-Mortem' },
		{ value: 'Closed', label: 'Closed' }
	];

	let modalTitle = $derived(mode === 'create' ? 'Create Incident' : 'Edit Incident');
	let submitLabel = $derived(mode === 'create' ? 'Create' : 'Save');

	// Presence tracking: emit on mount, cleanup on destroy.
	// Uses only the non-reactive `rowUuid` const so the effect has no
	// $state dependencies that could trigger re-runs.
	$effect(() => {
		if (mode === 'edit' && rowUuid) {
			emitEditingRowStatus(rowUuid, true);
		}

		return () => {
			if (rowUuid) {
				emitEditingRowStatus(rowUuid, false);
			}
		};
	});

	function convertFromEpoch(epochTime: number): string {
		if (!epochTime) return '';
		const date = new Date(epochTime);
		return date.toISOString().slice(0, 16);
	}

	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!title.trim()) {
			newErrors.title = 'Title is required';
		}
		if (!priority) {
			newErrors.priority = 'Priority is required';
		}
		if (!status) {
			newErrors.status = 'Status is required';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	async function handleSubmit() {
		if (!validate()) return;

		isSubmitting = true;

		try {
			const payload: Record<string, any> = {
				title: title.trim(),
				soar_ticket_id: soar_ticket_id.trim() || null,
				priority,
				status
			};

			let url: string;

			if (mode === 'create') {
				url = '/api/create/core/incident';
			} else {
				url = '/api/update/core/incident';
				payload.uuid = rowUuid;
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

			if (rowUuid) {
				emitIdle();
			}

			onsave();
		} catch (error) {
			console.error('Incident submission error:', error);
			errors = {
				...errors,
				_form: error instanceof Error ? error.message : 'An unexpected error occurred'
			};
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		if (rowUuid) {
			emitIdle();
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

				<!-- Title -->
				<div class="field">
					<label class="label" for="field-title">
						Title
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<input
						id="field-title"
						type="text"
						class="input"
						bind:value={title}
						placeholder="Brief description of the incident"
						required
					/>
					{#if errors.title}
						<p class="field-error" role="alert">{errors.title}</p>
					{/if}
					<p class="field-hint">Max 500 characters</p>
				</div>

				<!-- SOAR Ticket ID -->
				<div class="field">
					<label class="label" for="field-soar_ticket_id">
						SOAR Ticket ID
					</label>
					<input
						id="field-soar_ticket_id"
						type="text"
						class="input"
						bind:value={soar_ticket_id}
						placeholder="Optional SOAR ticket reference"
					/>
					{#if errors.soar_ticket_id}
						<p class="field-error" role="alert">{errors.soar_ticket_id}</p>
					{/if}
					<p class="field-hint">Max 10 characters, must be unique</p>
				</div>

				<!-- Priority -->
				<div class="field">
					<label class="label" for="field-priority">
						Priority
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<select
						id="field-priority"
						class="input select"
						bind:value={priority}
						required
					>
						<option value="">Select Priority</option>
						{#each priorityOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.priority}
						<p class="field-error" role="alert">{errors.priority}</p>
					{/if}
				</div>

				<!-- Status -->
				<div class="field">
					<label class="label" for="field-status">
						Status
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<select
						id="field-status"
						class="input select"
						bind:value={status}
						required
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

	/* ── Inputs (text, select) ── */
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

	/* ── Reduced motion ── */
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 0.01ms !important;
		}
	}
</style>
