<script lang="ts">
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { api, ApiError } from '$lib/client';
	import {
		actionTypes,
		currentSelectedIncident,
		currentSelectedAnalyst,
		knownJsonKeys,
		currentCachedEntities,
		currentCachedTimeline,
		relationTypes
	} from '$lib/stores/cacheStore';
	import { emitEditingRowStatus, emitIdle } from '$lib/stores/collabStore';
	import JsonKeyValueEditor from '$lib/components/JsonKeyValueEditor.svelte';
	import RelationshipBuilder, { type PendingLink } from '$lib/components/RelationshipBuilder.svelte';

	interface Props {
		mode: 'create' | 'edit';
		data?: any;
		onclose: () => void;
		onsave: () => void;
	}

	let { mode, data, onclose, onsave }: Props = $props();

	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});

	// Capture initial data snapshot — modal data does not change after mount
	const initial = untrack(() => data ?? {});
	const rowUuid: string | null = initial.uuid ?? null;

	// Relationship builder state — entities
	let pendingEntityLinks: PendingLink[] = $state([]);
	let removedEntityLinks: { targetUuid: string; relation: string }[] = $state([]);

	// Relationship builder state — events
	let pendingEventLinks: PendingLink[] = $state([]);
	let removedEventLinks: { targetUuid: string; relation: string }[] = $state([]);

	let formData = $state<Record<string, any>>({
		action_type: initial.action_type ?? '',
		performed_at: initial.performed_at ?? '',
		result: initial.result ?? '',
		tool_used: initial.tool_used ?? '',
		action_data: initial.action_data ?? '',
		notes: initial.notes ?? '',
		next_steps: initial.next_steps ?? '',
		tags: initial.tags ?? ''
	});

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
		const date = new Date(epochTime * 1000);
		return date.toISOString().slice(0, 16);
	}

	// Build available entities for relationship builder
	let availableEntities = $derived(
		$currentCachedEntities.map((e) => ({
			uuid: e.uuid,
			label: e.identifier,
			sublabel: e.entity_type
		}))
	);

	// Build available events for relationship builder
	let availableEvents = $derived(
		$currentCachedTimeline
			.filter((item) => item.type === 'event')
			.map((item) => {
				const d = item.data as any;
				const parts = [d.source, d.notes].filter(Boolean);
				const desc = parts.join(' \u2014 ');
				return {
					uuid: item.uuid,
					label: d.event_type ?? 'Event',
					sublabel: desc ? (desc.length > 60 ? desc.slice(0, 57) + '...' : desc) : undefined
				};
			})
	);

	// Build relation options from lookup store
	let relationOptionsList = $derived(
		$relationTypes.map((rt) => ({ value: rt.name, label: rt.name }))
	);

	// Extract existing entity links from enriched data (edit mode)
	let existingEntityLinks = $derived.by(() => {
		if (mode !== 'edit' || !initial) return [];
		const actionEntities = (initial as any).actionEntities || [];
		return actionEntities.map((rel: any) => ({
			targetUuid: rel.entity?.uuid ?? rel.entity_id ?? '',
			targetLabel: rel.entity?.identifier ?? rel.entity_id ?? 'Unknown',
			relation: rel.relation_type || 'related_to'
		}));
	});

	// Extract existing event links from enriched data (edit mode)
	let existingEventLinks = $derived.by(() => {
		if (mode !== 'edit' || !initial) return [];
		const actionEvents = (initial as any).actionEvents || [];
		return actionEvents.map((rel: any) => ({
			targetUuid: rel.event?.uuid ?? rel.event_id ?? '',
			targetLabel: rel.event?.event_type ?? rel.event_id ?? 'Unknown',
			relation: rel.relation_type || 'related_to'
		}));
	});

	function validate(): boolean {
		const newErrors: Record<string, string> = {};

		if (!formData.action_type) {
			newErrors.action_type = 'Action type is required.';
		}

		if (mode === 'create' && !formData.performed_at) {
			// Will default to now on submit, so no error needed
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	/**
	 * Batch-submit relationship creates and deletes after the main form is saved.
	 */
	async function submitRelationshipChanges(actionUuid: string, incidentId: string): Promise<void> {
		const promises: Promise<unknown>[] = [];

		// Create new entity links
		for (const link of pendingEntityLinks) {
			promises.push(
				api.actionEntities.create({
					action_uuid: actionUuid,
					entity_uuid: link.targetUuid,
					relation_type: link.relation,
					incident_id: incidentId
				})
			);
		}

		// Create new event links
		for (const link of pendingEventLinks) {
			promises.push(
				api.actionEvents.create({
					action_uuid: actionUuid,
					event_uuid: link.targetUuid,
					relation_type: link.relation,
					incident_id: incidentId
				})
			);
		}

		// Delete removed entity links
		for (const link of removedEntityLinks) {
			promises.push(
				api.actionEntities.delete(actionUuid, link.targetUuid)
			);
		}

		// Delete removed event links
		for (const link of removedEventLinks) {
			promises.push(
				api.actionEvents.delete(actionUuid, link.targetUuid)
			);
		}

		if (promises.length > 0) {
			const results = await Promise.allSettled(promises);
			const failures = results.filter((r) => r.status === 'rejected');
			if (failures.length > 0) {
				console.warn(`${failures.length} relationship operation(s) failed:`, failures);
			}
		}
	}

	async function handleSubmit() {
		if (!validate()) return;

		isSubmitting = true;

		try {
			const incident = get(currentSelectedIncident);
			const analyst = get(currentSelectedAnalyst);

			let performedAt: number;
			if (formData.performed_at && typeof formData.performed_at === 'string') {
				performedAt = Math.floor(new Date(formData.performed_at).getTime() / 1000);
			} else if (formData.performed_at && typeof formData.performed_at === 'number') {
				performedAt = formData.performed_at;
			} else {
				performedAt = Math.floor(Date.now() / 1000);
			}

			const payload: Record<string, any> = {
				action_type: formData.action_type,
				performed_at: performedAt,
				result: formData.result || null,
				tool_used: formData.tool_used || null,
				action_data: formData.action_data || null,
				notes: formData.notes || null,
				next_steps: formData.next_steps || null,
				tags: formData.tags || null,
				incident_id: incident?.uuid ?? null,
				actioned_by: analyst?.uuid ?? null
			};

			let result: any;

			if (mode === 'edit') {
				result = await api.actions.update(rowUuid!, payload as any);
			} else {
				result = await api.actions.create(payload as any);
			}

			// Get the UUID of the created/updated item
			const itemUuid = result?.uuid ?? rowUuid;
			const incidentId = get(currentSelectedIncident)?.uuid ?? '';

			// Batch-submit relationship changes
			await submitRelationshipChanges(itemUuid, incidentId);

			// Emit idle before closing (successful submission)
			if (rowUuid) {
				emitIdle();
			}

			onsave();
		} catch (error) {
			console.error('Action modal submit error:', error);
			errors = { _form: error instanceof ApiError ? error.message : (error as Error).message };
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={handleCancel}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="modal" onclick={(e) => e.stopPropagation()}>
		<header class="modal-header">
			<h2 class="modal-title">
				{mode === 'create' ? 'Create' : 'Edit'} Investigation Action
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
				{#if errors._form}
					<p class="field-error form-error" role="alert">{errors._form}</p>
				{/if}

				<!-- Action Type -->
				<div class="field">
					<label class="label" for="field-action_type">
						Action Type
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<select
						id="field-action_type"
						class="input select"
						bind:value={formData.action_type}
						required
					>
						<option value="">Select Action Type</option>
						{#each $actionTypes as at (at.name)}
							<option value={at.name}>{at.name}</option>
						{/each}
					</select>
					{#if errors.action_type}
						<p class="field-error" role="alert">{errors.action_type}</p>
					{/if}
					<p class="field-hint">Max 50 characters</p>
				</div>

				<!-- Performed At -->
				<div class="field">
					<label class="label" for="field-performed_at">
						Performed At
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<input
						id="field-performed_at"
						type="datetime-local"
						class="input"
						value={formData.performed_at ? convertFromEpoch(formData.performed_at) : ''}
						oninput={(e) => {
							formData.performed_at = e.currentTarget.value;
						}}
						required
					/>
					{#if errors.performed_at}
						<p class="field-error" role="alert">{errors.performed_at}</p>
					{/if}
				</div>

				<!-- Result -->
				<div class="field">
					<label class="label" for="field-result">Result</label>
					<select
						id="field-result"
						class="input select"
						bind:value={formData.result}
					>
						<option value="">Select Result</option>
						<option value="success">Success</option>
						<option value="failed">Failed</option>
						<option value="partial">Partial</option>
						<option value="pending">Pending</option>
					</select>
				</div>

				<!-- Tool Used -->
				<div class="field">
					<label class="label" for="field-tool_used">Tool Used</label>
					<input
						id="field-tool_used"
						type="text"
						class="input"
						bind:value={formData.tool_used}
						placeholder="e.g., Wireshark, Splunk, PowerShell"
					/>
					<p class="field-hint">Max 100 characters</p>
				</div>

				<!-- Action Data (JSON) -->
				<div class="field">
					<label class="label" for="field-action_data">Action Data</label>
					<JsonKeyValueEditor
						value={formData.action_data ?? ''}
						knownKeys={$knownJsonKeys['action']}
					placeholder={'{"key": "value"}'}
						onchange={(v) => { formData.action_data = v; }}
					/>
					<p class="field-hint">Structured key-value data. Use builder mode or paste raw JSON.</p>
				</div>

				<!-- Notes -->
				<div class="field">
					<label class="label" for="field-notes">Notes</label>
					<textarea
						id="field-notes"
						class="input textarea"
						bind:value={formData.notes}
						rows="4"
					></textarea>
				</div>

				<!-- Next Steps -->
				<div class="field">
					<label class="label" for="field-next_steps">Next Steps</label>
					<textarea
						id="field-next_steps"
						class="input textarea"
						bind:value={formData.next_steps}
						rows="4"
					></textarea>
				</div>

				<!-- Tags -->
				<div class="field">
					<label class="label" for="field-tags">Tags</label>
					<input
						id="field-tags"
						type="text"
						class="input"
						bind:value={formData.tags}
						placeholder="Comma-separated tags"
					/>
				</div>

				<!-- ─── Relationship Builders ─── -->
				<div class="relationships-section">
					<RelationshipBuilder
						label="Linked Entities"
						availableItems={availableEntities}
						relationOptions={relationOptionsList}
						existingLinks={existingEntityLinks}
						targetPlaceholder="Select entity..."
						relationPlaceholder="Select relation..."
						onchange={(pending, removed) => {
							pendingEntityLinks = pending;
							removedEntityLinks = removed;
						}}
					/>
				</div>

				<div class="relationships-section">
					<RelationshipBuilder
						label="Linked Events"
						availableItems={availableEvents}
						relationOptions={relationOptionsList}
						existingLinks={existingEventLinks}
						targetPlaceholder="Select event..."
						relationPlaceholder="Select relation..."
						onchange={(pending, removed) => {
							pendingEventLinks = pending;
							removedEventLinks = removed;
						}}
					/>
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
		max-width: 640px;
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

	/* ── Validation error ── */
	.field-error {
		font-size: var(--text-xs);
		color: hsl(var(--destructive-default));
		margin-top: var(--space-1);
	}

	/* ── Form-level error ── */
	.form-error {
		margin-bottom: var(--space-3);
		padding: var(--space-2);
		background: hsl(var(--destructive-500) / 0.2);
		border: var(--border-width) solid hsl(var(--destructive-default) / 0.4);
		border-radius: var(--radius-md);
	}

	/* ── Help text ── */
	.field-hint {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		margin-top: var(--space-1);
	}

	/* ── Relationships section ── */
	.relationships-section {
		margin-top: var(--space-4);
		padding-top: var(--space-4);
		border-top: var(--border-width) solid hsl(var(--border-muted));
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
