<script lang="ts">
	import TimelineRow from '$lib/components/views/default-log/TimelineRow.svelte';
	import type { TimelineItem } from '$lib/timeline/core';
	import type { DisplayFieldsConfiguration } from '$lib/config/displayFieldsConfig';

	interface Props {
		items: TimelineItem[];
		displayFieldsConfig: DisplayFieldsConfiguration;
		searchQuery: string;
		totalItemCount: number;
		hasIncident: boolean;
		onClearSearch: () => void;
	}

	let {
		items,
		displayFieldsConfig,
		searchQuery,
		totalItemCount,
		hasIncident,
		onClearSearch
	}: Props = $props();
</script>

{#if !hasIncident}
	<div class="empty-state">
		<span class="empty-state-icon">⚠</span>
		<div class="empty-state-title">No incident selected</div>
		<div class="empty-state-description">Select an active incident to view timeline events.</div>
	</div>
{:else if items.length === 0 && searchQuery.trim()}
	<div class="empty-state">
		<span class="empty-state-icon">🔍</span>
		<div class="empty-state-title">No results for "{searchQuery.trim()}"</div>
		<div class="empty-state-description">
			No timeline items matched your search. Try a different query or <button class="btn-ghost btn-sm" onclick={onClearSearch}>clear the search</button>.
		</div>
	</div>
{:else if totalItemCount === 0}
	<div class="empty-state">
		<span class="empty-state-icon">📊</span>
		<div class="empty-state-title">No timeline data found</div>
		<div class="empty-state-description">
			No timeline events or investigation actions found for this incident. Use the toolbar above to add events, actions, entities, or annotations.
		</div>
	</div>
{:else}
	<div class="timeline-list">
		{#each items as item (item.uuid)}
			<TimelineRow {item} {displayFieldsConfig} />
		{/each}
	</div>
{/if}

<style>
	/* ===== Empty State (SOP §10.12) ===== */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-10) var(--space-6);
		color: hsl(var(--fg-lighter));
	}

	.empty-state-icon {
		font-size: var(--text-3xl);
		margin-bottom: var(--space-3);
		opacity: 0.4;
	}

	.empty-state-title {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-light));
		margin-bottom: var(--space-2);
	}

	.empty-state-description {
		font-size: var(--text-sm);
		color: hsl(var(--fg-lighter));
		max-width: 400px;
		line-height: var(--leading-normal);
	}

	/* ===== Timeline List ===== */
	.timeline-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	/* ===== Button Styles (SOP §10.1) ===== */
	.btn-ghost {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-light));
		background: transparent;
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		min-height: 32px;
		white-space: nowrap;
	}

	.btn-ghost:hover {
		background: hsl(var(--bg-surface-200));
		color: hsl(var(--fg-default));
	}

	/* Small button size (SOP §10.1) */
	.btn-sm {
		padding: var(--space-1) var(--space-2);
		font-size: var(--text-xs);
		min-height: 24px;
	}
</style>
