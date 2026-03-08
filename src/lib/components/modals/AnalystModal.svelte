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

	// ── Form state (initialized from snapshot) ──
	let username = $state(initial.username ?? '');
	let full_name = $state(initial.full_name ?? '');
	let role = $state(initial.role ?? 'analyst');
	let active = $state(initial.active !== undefined ? Boolean(initial.active) : true);

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	// ── Role options (static) ──
	const roleOptions = [
		{ value: 'analyst', label: 'Analyst' },
		{ value: 'on-point lead', label: 'On-Point Lead' },
		{ value: 'observer', label: 'Observer' }
	];

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

	// ── Validation ──
	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!username.trim()) {
			newErrors.username = 'Username is required';
		} else if (username.trim().length > 100) {
			newErrors.username = 'Username must be 100 characters or fewer';
		}

		if (full_name.trim().length > 100) {
			newErrors.full_name = 'Full name must be 100 characters or fewer';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	// ── Submit ──
	async function handleSubmit() {
		if (!validate()) return;

		isSubmitting = true;
		try {
			const payload: Record<string, any> = {
				username: username.trim(),
				full_name: full_name.trim() || null,
				role,
				active
			};

			if (mode === 'edit' && rowUuid) {
				payload.uuid = rowUuid;
			}

			const endpoint =
				mode === 'create'
					? '/api/create/core/analyst'
					: '/api/update/core/analyst';

			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const body = await res.json().catch(() => null);
				const message = body?.message ?? body?.error ?? `Server error (${res.status})`;
				errors = { _form: message };
				return;
			}

			// Emit idle on successful submission
			if (rowUuid) {
				emitIdle();
			}

			onsave();
		} catch (err) {
			console.error('Analyst modal submit error:', err);
			errors = { _form: 'An unexpected error occurred' };
		} finally {
			isSubmitting = false;
		}
	}

	// ── Cancel ──
	function handleCancel() {
		if (rowUuid) {
			emitIdle();
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
				{mode === 'create' ? 'Create' : 'Edit'} Analyst
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
				<!-- Form-level error -->
				{#if errors._form}
					<p class="form-error" role="alert">{errors._form}</p>
				{/if}

				<!-- Username -->
				<div class="field">
					<label class="label" for="field-username">
						Username
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<input
						id="field-username"
						type="text"
						class="input"
						bind:value={username}
						placeholder="Your username"
						required
					/>
					{#if errors.username}
						<p class="field-error" role="alert">{errors.username}</p>
					{/if}
					<p class="field-hint">Max 100 characters - Must be unique</p>
				</div>

				<!-- Full Name -->
				<div class="field">
					<label class="label" for="field-full_name">
						Full Name
					</label>
					<input
						id="field-full_name"
						type="text"
						class="input"
						bind:value={full_name}
						placeholder="John Doe"
					/>
					{#if errors.full_name}
						<p class="field-error" role="alert">{errors.full_name}</p>
					{/if}
					<p class="field-hint">Max 100 characters</p>
				</div>

				<!-- Role -->
				<div class="field">
					<label class="label" for="field-role">
						Role
					</label>
					<select
						id="field-role"
						class="input select"
						bind:value={role}
					>
						{#each roleOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- Active -->
				<div class="field">
					<label class="label" for="field-active">
						Active
					</label>
					<div class="checkbox-row">
						<input
							id="field-active"
							type="checkbox"
							class="checkbox"
							bind:checked={active}
						/>
						<span class="checkbox-label">Enabled</span>
					</div>
					<p class="field-hint">Uncheck to soft-delete analyst</p>
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
	.checkbox-label {
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
	}

	/* ── Validation error ── */
	.field-error {
		font-size: var(--text-xs);
		color: hsl(var(--destructive-default));
		margin-top: var(--space-1);
	}

	/* ── Form-level error ── */
	.form-error {
		font-size: var(--text-sm);
		color: hsl(var(--destructive-default));
		background: hsl(var(--destructive-200));
		border: var(--border-width) solid hsl(var(--destructive-500));
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-3);
		margin-bottom: var(--space-3);
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
