<script lang="ts">
	/**
	 * RelationshipBuilder — Bulk inline relationship editor.
	 *
	 * Inspired by JsonKeyValueEditor — lets users add/remove multiple
	 * relationship rows inline without reopening the modal.
	 *
	 * Usage:
	 *   <RelationshipBuilder
	 *     label="Linked Entities"
	 *     availableItems={entities}
	 *     relationOptions={roleOptions}
	 *     existingLinks={existingEntityLinks}
	 *     onchange={(pending, removed) => { ... }}
	 *   />
	 */

	import { SvelteSet } from 'svelte/reactivity';

	interface AvailableItem {
		uuid: string;
		label: string;
		sublabel?: string;
	}

	interface RelationOption {
		value: string;
		label: string;
	}

	interface ExistingLink {
		targetUuid: string;
		targetLabel: string;
		relation: string;
		context?: string;
	}

	export interface PendingLink {
		targetUuid: string;
		relation: string;
		context?: string;
	}

	interface Props {
		label: string;
		availableItems: AvailableItem[];
		relationOptions: RelationOption[];
		existingLinks?: ExistingLink[];
		showContext?: boolean;
		targetPlaceholder?: string;
		relationPlaceholder?: string;
		onchange: (pending: PendingLink[], removed: ExistingLink[]) => void;
	}

	let {
		label,
		availableItems,
		relationOptions,
		existingLinks = [],
		showContext = false,
		targetPlaceholder = 'Select item...',
		relationPlaceholder = 'Select relation...',
		onchange
	}: Props = $props();

	type PendingRow = { targetUuid: string; relation: string; context: string };

	// Track existing links that user wants to remove
	let removedExisting: SvelteSet<string> = new SvelteSet();

	// Track new rows being added
	let pendingRows: PendingRow[] = $state([]);

	// Derive which existing links are still kept (not removed)
	let keptExisting = $derived(
		existingLinks.filter((l) => !removedExisting.has(linkKey(l)))
	);

	// Items already linked (existing kept + pending) — prevent duplicates
	let linkedUuids = $derived(new Set([
		...keptExisting.map((l) => l.targetUuid),
		...pendingRows.map((r) => r.targetUuid).filter((u) => u !== '')
	]));

	// Available items for each pending row (exclude already-linked, except self)
	function getAvailableForRow(rowIndex: number): AvailableItem[] {
		const currentUuid = pendingRows[rowIndex]?.targetUuid ?? '';
		return availableItems.filter(
			(item) => item.uuid === currentUuid || !linkedUuids.has(item.uuid)
		);
	}

	function linkKey(link: ExistingLink): string {
		return `${link.targetUuid}::${link.relation}`;
	}

	function addRow() {
		pendingRows.push({ targetUuid: '', relation: '', context: '' });
	}

	function removeRow(index: number) {
		pendingRows.splice(index, 1);
		emitChange();
	}

	function removeExisting(link: ExistingLink) {
		removedExisting.add(linkKey(link));
		emitChange();
	}

	function restoreExisting(link: ExistingLink) {
		removedExisting.delete(linkKey(link));
		emitChange();
	}

	function updatePendingTarget(index: number, uuid: string) {
		pendingRows[index].targetUuid = uuid;
		emitChange();
	}

	function updatePendingRelation(index: number, relation: string) {
		pendingRows[index].relation = relation;
		emitChange();
	}

	function updatePendingContext(index: number, context: string) {
		pendingRows[index].context = context;
		emitChange();
	}

	function emitChange() {
		const validPending: PendingLink[] = pendingRows
			.filter((r) => r.targetUuid !== '' && r.relation !== '')
			.map((r) => ({
				targetUuid: r.targetUuid,
				relation: r.relation,
				...(showContext && r.context ? { context: r.context } : {})
			}));

		const removedLinks = existingLinks.filter((l) => removedExisting.has(linkKey(l)));

		onchange(validPending, removedLinks);
	}

	// Total count for the section header
	let totalCount = $derived(keptExisting.length + pendingRows.filter((r) => r.targetUuid).length);
</script>

<div class="relationship-builder">
	<div class="section-header">
		<span class="section-label">{label}</span>
		{#if totalCount > 0}
			<span class="section-count">{totalCount}</span>
		{/if}
	</div>

	<!-- Existing relationships (saved) -->
	{#each existingLinks as link (linkKey(link))}
		{@const isRemoved = removedExisting.has(linkKey(link))}
		<div class="link-row" class:removed={isRemoved}>
			<span class="link-target mono">{link.targetLabel}</span>
			<span class="link-relation">{link.relation}</span>
			{#if showContext && link.context}
				<span class="link-context mono">{link.context}</span>
			{/if}
			<span class="link-saved-badge">saved</span>
			{#if isRemoved}
				<button
					type="button"
					class="restore-btn"
					title="Restore this relationship"
					onclick={() => restoreExisting(link)}
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<polyline points="1 4 1 10 7 10" />
						<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
					</svg>
				</button>
			{:else}
				<button
					type="button"
					class="remove-btn"
					title="Remove this relationship"
					onclick={() => removeExisting(link)}
				>
					<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
						<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</button>
			{/if}
		</div>
	{/each}

	<!-- Pending new relationships -->
	{#each pendingRows as row, i (i)}
		<div class="link-row pending">
			<select
				class="link-select target-select"
				value={row.targetUuid}
				onchange={(e) => updatePendingTarget(i, e.currentTarget.value)}
			>
				<option value="">{targetPlaceholder}</option>
				{#each getAvailableForRow(i) as item (item.uuid)}
					<option value={item.uuid}>
						{item.label}{item.sublabel ? ` (${item.sublabel})` : ''}
					</option>
				{/each}
			</select>

			<select
				class="link-select relation-select"
				value={row.relation}
				onchange={(e) => updatePendingRelation(i, e.currentTarget.value)}
			>
				<option value="">{relationPlaceholder}</option>
				{#each relationOptions as opt (opt.value)}
					<option value={opt.value}>{opt.label}</option>
				{/each}
			</select>

			{#if showContext}
				<input
					type="text"
					class="link-input context-input"
					placeholder="Context..."
					value={row.context}
					oninput={(e) => updatePendingContext(i, (e.target as HTMLInputElement).value)}
				/>
			{/if}

			<button
				type="button"
				class="remove-btn"
				title="Remove row"
				onclick={() => removeRow(i)}
			>
				<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			</button>
		</div>
	{/each}

	<!-- Add button -->
	<button type="button" class="add-btn" onclick={addRow}>
		+ Add {label.replace(/^Linked?\s*/i, '').replace(/s$/, '')}
	</button>

	{#if availableItems.length === 0}
		<p class="empty-hint">No items available to link. Create some first.</p>
	{/if}
</div>

<style>
	.relationship-builder {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding-bottom: var(--space-1);
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		margin-bottom: var(--space-1);
	}

	.section-label {
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-light));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.section-count {
		font-size: var(--text-2xs);
		font-weight: var(--font-medium);
		color: hsl(var(--brand-default));
		background: hsl(var(--brand-default) / 0.12);
		padding: var(--space-0\.5) var(--space-1);
		border-radius: var(--radius-full);
		min-width: 18px;
		text-align: center;
	}

	/* ── Row (shared between existing and pending) ── */
	.link-row {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-1\.5);
		border-radius: var(--radius-sm);
		background: hsl(var(--bg-surface-200));
		border: var(--border-width) solid hsl(var(--border-muted));
		transition: var(--transition-colors);
	}

	.link-row.pending {
		border-style: dashed;
		border-color: hsl(var(--border-default));
	}

	.link-row.removed {
		opacity: 0.4;
		text-decoration: line-through;
		background: hsl(var(--destructive-default) / 0.05);
		border-color: hsl(var(--destructive-default) / 0.2);
	}

	/* ── Existing link display ── */
	.link-target {
		flex: 1;
		font-size: var(--text-xs);
		color: hsl(var(--fg-data));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.link-relation {
		font-size: var(--text-2xs);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-lighter));
		background: hsl(var(--bg-surface-300));
		padding: var(--space-0\.5) var(--space-1);
		border-radius: var(--radius-sm);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.link-context {
		font-size: var(--text-2xs);
		color: hsl(var(--fg-lighter));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 120px;
	}

	.link-saved-badge {
		font-size: var(--text-2xs);
		color: hsl(var(--success-default));
		background: hsl(var(--success-default) / 0.1);
		padding: var(--space-0\.5) var(--space-1);
		border-radius: var(--radius-sm);
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ── Pending row inputs ── */
	.link-select {
		padding: var(--space-1) var(--space-1\.5);
		background: hsl(var(--bg-surface-200));
		border: var(--border-width) solid hsl(var(--border-muted));
		border-radius: var(--radius-sm);
		color: hsl(var(--fg-default));
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		cursor: pointer;
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237d7672' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right var(--space-1) center;
		background-size: 12px;
		padding-right: var(--space-5);
		transition: var(--transition-colors);
	}

	.link-select:focus {
		outline: none;
		border-color: hsl(var(--brand-default));
	}

	.link-select:focus-visible {
		outline: none;
		border-color: hsl(var(--border-focus));
		box-shadow: 0 0 0 1px hsl(var(--border-focus));
	}

	.target-select {
		flex: 1;
		min-width: 0;
	}

	.relation-select {
		flex-shrink: 0;
		width: auto;
		min-width: 120px;
	}

	.link-input {
		padding: var(--space-1) var(--space-1\.5);
		background: hsl(var(--bg-surface-200));
		border: var(--border-width) solid hsl(var(--border-muted));
		border-radius: var(--radius-sm);
		color: hsl(var(--fg-default));
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		transition: var(--transition-colors);
	}

	.link-input:focus {
		outline: none;
		border-color: hsl(var(--brand-default));
	}

	.link-input:focus-visible {
		outline: none;
		border-color: hsl(var(--border-focus));
		box-shadow: 0 0 0 1px hsl(var(--border-focus));
	}

	.link-input::placeholder {
		color: hsl(var(--fg-muted));
	}

	.context-input {
		flex: 0.8;
		min-width: 80px;
	}

	/* ── Buttons ── */
	.remove-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		background: transparent;
		border: var(--border-width) solid transparent;
		color: hsl(var(--fg-muted));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
		flex-shrink: 0;
	}

	.remove-btn:hover {
		color: hsl(var(--destructive-default));
		border-color: hsl(var(--destructive-default) / 0.3);
	}

	.remove-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.restore-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		padding: 0;
		background: transparent;
		border: var(--border-width) solid transparent;
		color: hsl(var(--fg-muted));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
		flex-shrink: 0;
	}

	.restore-btn:hover {
		color: hsl(var(--success-default));
		border-color: hsl(var(--success-default) / 0.3);
	}

	.restore-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.add-btn {
		padding: var(--space-1) var(--space-2);
		background: transparent;
		border: var(--border-width) dashed hsl(var(--border-muted));
		color: hsl(var(--fg-lighter));
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: var(--transition-colors);
	}

	.add-btn:hover {
		border-color: hsl(var(--brand-default));
		color: hsl(var(--brand-default));
		background: hsl(var(--brand-default) / 0.05);
	}

	.add-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.empty-hint {
		font-size: var(--text-2xs);
		color: hsl(var(--fg-muted));
		font-style: italic;
		margin: 0;
	}

	/* ── Monospace data class ── */
	.mono {
		font-family: var(--font-mono);
		letter-spacing: var(--tracking-mono);
	}
</style>
