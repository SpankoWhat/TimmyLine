<script lang="ts">
	import { untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { eventTypes, currentSelectedIncident, currentSelectedAnalyst, knownJsonKeys, currentCachedEntities, relationTypes } from '$lib/stores/cacheStore';
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
	let editingRowUuid: string | null = $state(null);

	// Relationship builder state
	let pendingEntityLinks: PendingLink[] = $state([]);
	let removedEntityLinks: { targetUuid: string; relation: string }[] = $state([]);

	// Capture initial data snapshot — modal data does not change after mount
	const initial = untrack(() => data ?? {});

	let formData = $state<Record<string, any>>({
		event_type: initial.event_type ?? '',
		discovered_at: initial.discovered_at ? convertFromEpoch(initial.discovered_at) : '',
		occurred_at: initial.occurred_at ? convertFromEpoch(initial.occurred_at) : '',
		notes: initial.notes ?? '',
		event_data: initial.event_data ?? '',
		severity: initial.severity ?? '',
		confidence: initial.confidence ?? '',
		source: initial.source ?? '',
		source_reliability: initial.source_reliability ?? '',
		tags: initial.tags ?? ''
	});

	// Emit editing presence on mount for edit mode
	const initialUuid = initial.uuid ?? null;

	$effect(() => {
		if (mode === 'edit' && initialUuid) {
			editingRowUuid = initialUuid;
			emitEditingRowStatus(editingRowUuid, true);
		}

		return () => {
			if (editingRowUuid) {
				emitEditingRowStatus(editingRowUuid, false);
				editingRowUuid = null;
			}
		};
	});

	// Build available entities for relationship builder
	let availableEntities = $derived(
		$currentCachedEntities.map((e) => ({
			uuid: e.uuid,
			label: e.identifier,
			sublabel: e.entity_type
		}))
	);

	// Build relation options from lookup store
	let entityRelationOptions = $derived(
		$relationTypes.map((rt) => ({ value: rt.name, label: rt.name }))
	);

	// Extract existing entity links from enriched data (edit mode)
	let existingEntityLinks = $derived.by(() => {
		if (mode !== 'edit' || !initial) return [];
		const eventEntities = (initial as any).eventEntities || [];
		return eventEntities.map((rel: any) => ({
			targetUuid: rel.entity?.uuid ?? rel.entity_id ?? '',
			targetLabel: rel.entity?.identifier ?? rel.entity_id ?? 'Unknown',
			relation: rel.role || rel.relation_type || 'related_to',
			context: rel.context || ''
		}));
	});

	// Severity options
	const severityOptions = [
		{ value: 'critical', label: 'Critical' },
		{ value: 'high', label: 'High' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'low', label: 'Low' },
		{ value: 'info', label: 'Info' }
	];

	// Confidence options
	const confidenceOptions = [
		{ value: 'high', label: 'High' },
		{ value: 'medium', label: 'Medium' },
		{ value: 'low', label: 'Low' },
		{ value: 'guess', label: 'Guess' }
	];

	// JSON placeholder (curly braces can't be inline in Svelte attributes)
	const jsonPlaceholder = '{"key": "value"}';

	// Source reliability options (NATO Admiralty Scale)
	const sourceReliabilityOptions = [
		{ value: 'A', label: 'A - Completely Reliable' },
		{ value: 'B', label: 'B - Usually Reliable' },
		{ value: 'C', label: 'C - Fairly Reliable' },
		{ value: 'D', label: 'D - Not Usually Reliable' },
		{ value: 'E', label: 'E - Unreliable' },
		{ value: 'F', label: 'F - Cannot Be Judged' }
	];

	// Derive event type options from store
	let eventTypeOptions = $derived(
		$eventTypes.map((item) => ({ value: item.name, label: item.name }))
	);

	function convertFromEpoch(epochTime: number): string {
		if (!epochTime) return '';
		const date = new Date(epochTime * 1000);
		return date.toISOString().slice(0, 16);
	}

	function toEpoch(datetimeStr: string): number {
		return Math.floor(new Date(datetimeStr).getTime() / 1000);
	}

	function validate(): Record<string, string> | null {
		const errs: Record<string, string> = {};

		if (!formData.event_type) {
			errs.event_type = 'Event type is required.';
		}

		if (!formData.event_data || formData.event_data.trim() === '') {
			errs.event_data = 'Event data is required.';
		}

		// discovered_at: if provided, cannot be in the future
		if (formData.discovered_at) {
			const discoveredEpoch = toEpoch(formData.discovered_at);
			const nowEpoch = Math.floor(Date.now() / 1000);
			if (discoveredEpoch > nowEpoch) {
				errs.discovered_at = 'Discovered date cannot be in the future.';
			}
		}

		return Object.keys(errs).length > 0 ? errs : null;
	}

	/**
	 * Batch-submit relationship creates and deletes after the main form is saved.
	 */
	async function submitRelationshipChanges(eventUuid: string, incidentId: string): Promise<void> {
		const promises: Promise<Response>[] = [];

		// Create new entity links
		for (const link of pendingEntityLinks) {
			promises.push(
				fetch('/api/create/junction/event_entities', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						event_uuid: eventUuid,
						entity_uuid: link.targetUuid,
						role: link.relation,
						context: link.context || null,
						incident_id: incidentId
					})
				})
			);
		}

		// Delete removed entity links
		for (const link of removedEntityLinks) {
			promises.push(
				fetch('/api/delete/junction', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						table: 'event_entities',
						event_id: eventUuid,
						entity_id: link.targetUuid
					})
				})
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
		const validationErrors = validate();
		if (validationErrors) {
			errors = validationErrors;
			return;
		}

		errors = {};
		isSubmitting = true;

		try {
			const incident = get(currentSelectedIncident);
			const analyst = get(currentSelectedAnalyst);

			// Build submission payload
			const payload: Record<string, any> = {
				event_type: formData.event_type,
				notes: formData.notes,
				event_data: formData.event_data,
				severity: formData.severity,
				confidence: formData.confidence,
				source: formData.source,
				source_reliability: formData.source_reliability,
				tags: formData.tags,
				incident_id: incident?.uuid ?? '',
				discovered_by: analyst?.uuid ?? ''
			};

			// Epoch conversion for discovered_at
			if (formData.discovered_at) {
				payload.discovered_at = toEpoch(formData.discovered_at);
			} else {
				payload.discovered_at = Math.floor(Date.now() / 1000);
			}

			// Epoch conversion for occurred_at
			if (formData.occurred_at) {
				payload.occurred_at = toEpoch(formData.occurred_at);
			}

			// Include uuid for edit mode
			if (mode === 'edit' && initialUuid) {
				payload.uuid = initialUuid;
			}

			const endpoint =
				mode === 'create'
					? '/api/create/core/timeline_event'
					: '/api/update/core/timeline_event';

			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Request failed with status ${response.status}`);
			}

			// Get the UUID of the created/updated item
			const result = await response.json();
			const itemUuid = result?.uuid ?? initialUuid;
			const incidentId = get(currentSelectedIncident)?.uuid ?? '';

			// Batch-submit relationship changes
			await submitRelationshipChanges(itemUuid, incidentId);

			// Emit idle before closing on success
			if (editingRowUuid) {
				emitIdle();
				editingRowUuid = null;
			}

			onsave();
		} catch (error) {
			console.error('EventModal submission error:', error);
			errors.form = error instanceof Error ? error.message : 'An unexpected error occurred.';
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
				{mode === 'create' ? 'Create' : 'Edit'} Timeline Event
			</h2>
			<button
				type="button"
				class="btn-icon"
				aria-label="Close modal"
				onclick={handleCancel}
			>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</button>
		</header>

		<div class="modal-body">
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
				{#if errors.form}
					<div class="form-error" role="alert">{errors.form}</div>
				{/if}

				<!-- Event Type -->
				<div class="field">
					<label class="label" for="field-event_type">
						Event Type
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<select
						id="field-event_type"
						class="input select"
						bind:value={formData.event_type}
						required
					>
						<option value="">Select Event Type</option>
						{#each eventTypeOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
					{#if errors.event_type}
						<p class="field-error" role="alert">{errors.event_type}</p>
					{/if}
					<p class="field-hint">Max 50 characters</p>
				</div>

				<!-- Discovered At -->
				<div class="field">
					<label class="label" for="field-discovered_at">
						Discovered At
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<input
						id="field-discovered_at"
						type="datetime-local"
						class="input"
						value={formData.discovered_at}
						oninput={(e) => { formData.discovered_at = e.currentTarget.value; }}
						required
					/>
					{#if errors.discovered_at}
						<p class="field-error" role="alert">{errors.discovered_at}</p>
					{/if}
					<p class="field-hint">When the analyst discovered this event</p>
				</div>

				<!-- Occurred At -->
				<div class="field">
					<label class="label" for="field-occurred_at">
						Occurred At
					</label>
					<input
						id="field-occurred_at"
						type="datetime-local"
						class="input"
						value={formData.occurred_at}
						oninput={(e) => { formData.occurred_at = e.currentTarget.value; }}
					/>
					<p class="field-hint">When the event actually happened (may be unknown)</p>
				</div>

				<!-- Notes -->
				<div class="field">
					<label class="label" for="field-notes">
						Notes
					</label>
					<textarea
						id="field-notes"
						class="input textarea"
						bind:value={formData.notes}
						placeholder="Additional context or observations about the event"
						rows="4"
					></textarea>
				</div>

				<!-- Event Data (JSON) -->
				<div class="field">
					<label class="label" for="field-event_data">
						Event Data
						<span class="field-required" aria-hidden="true">*</span>
					</label>
					<JsonKeyValueEditor
						value={formData.event_data ?? ''}
						knownKeys={$knownJsonKeys['event']}
						placeholder={jsonPlaceholder}
						onchange={(v) => { formData.event_data = v; }}
					/>
					{#if errors.event_data}
						<p class="field-error" role="alert">{errors.event_data}</p>
					{/if}
					<p class="field-hint">Structured key-value data. Use builder mode or paste raw JSON.</p>
				</div>

				<!-- Severity -->
				<div class="field">
					<label class="label" for="field-severity">
						Severity
					</label>
					<select
						id="field-severity"
						class="input select"
						bind:value={formData.severity}
					>
						<option value="">Select Severity</option>
						{#each severityOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- Confidence -->
				<div class="field">
					<label class="label" for="field-confidence">
						Confidence
					</label>
					<select
						id="field-confidence"
						class="input select"
						bind:value={formData.confidence}
					>
						<option value="">Select Confidence</option>
						{#each confidenceOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- Source -->
				<div class="field">
					<label class="label" for="field-source">
						Source
					</label>
					<input
						id="field-source"
						type="text"
						class="input"
						bind:value={formData.source}
						placeholder="e.g., Firewall, EDR, SIEM"
					/>
					<p class="field-hint">Max 200 characters</p>
				</div>

				<!-- Source Reliability -->
				<div class="field">
					<label class="label" for="field-source_reliability">
						Source Reliability
					</label>
					<select
						id="field-source_reliability"
						class="input select"
						bind:value={formData.source_reliability}
					>
						<option value="">Select Reliability</option>
						{#each sourceReliabilityOptions as option (option.value)}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
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
						bind:value={formData.tags}
						placeholder="Comma-separated tags"
					/>
				</div>

				<!-- ─── Relationship Builders ─── -->
				<div class="relationships-section">
					<RelationshipBuilder
						label="Linked Entities"
						availableItems={availableEntities}
						relationOptions={entityRelationOptions}
						existingLinks={existingEntityLinks}
						showContext={true}
						targetPlaceholder="Select entity..."
						relationPlaceholder="Select role..."
						onchange={(pending, removed) => {
							pendingEntityLinks = pending;
							removedEntityLinks = removed;
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
							<circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round" />
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
		font-size: var(--text-xs);
		color: hsl(var(--destructive-default));
		background: hsl(var(--destructive-200));
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
