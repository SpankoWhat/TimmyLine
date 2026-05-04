<script lang="ts">
	import type { EntityTimelineGroup, EntityTimelineItemFilter } from '$lib/timeline/core';
	import EntityTimelineSection from './entities/EntityTimelineSection.svelte';

	interface Props {
		entityGroups: EntityTimelineGroup[];
		searchQuery: string;
		totalEntityCount: number;
		hasIncident: boolean;
		onClearSearch: () => void;
	}

	let {
		entityGroups,
		searchQuery,
		totalEntityCount,
		hasIncident,
		onClearSearch
	}: Props = $props();

	let relatedItemFilter = $state<EntityTimelineItemFilter>('both');

	const relatedItemTotals = $derived.by(() => {
		return entityGroups.reduce(
			(totals, group) => {
				for (const entityNode of group.entities) {
					totals.both += entityNode.relatedCounts.total;
					totals.events += entityNode.relatedCounts.events;
					totals.actions += entityNode.relatedCounts.actions;
				}
				return totals;
			},
			{ both: 0, events: 0, actions: 0 }
		);
	});

	const filterOptions: Array<{ value: EntityTimelineItemFilter; label: string }> = [
		{ value: 'both', label: 'Both' },
		{ value: 'events', label: 'Events' },
		{ value: 'actions', label: 'Actions' }
	];

	function getFilterCount(filter: EntityTimelineItemFilter): number {
		switch (filter) {
			case 'events':
				return relatedItemTotals.events;
			case 'actions':
				return relatedItemTotals.actions;
			default:
				return relatedItemTotals.both;
		}
	}
</script>

{#if !hasIncident}
	<div class="empty-state">
		<span class="empty-state-icon">⚠</span>
		<div class="empty-state-title">No incident selected</div>
		<div class="empty-state-description">Select an active incident to pivot the timeline around entities.</div>
	</div>
{:else if entityGroups.length === 0 && searchQuery.trim()}
	<div class="empty-state">
		<span class="empty-state-icon">🔍</span>
		<div class="empty-state-title">No entities matched "{searchQuery.trim()}"</div>
		<div class="empty-state-description">
			Try a different entity search or
			<button class="btn-ghost btn-sm" onclick={onClearSearch}>clear the search</button>.
		</div>
	</div>
{:else if totalEntityCount === 0}
	<div class="empty-state">
		<span class="empty-state-icon">◆</span>
		<div class="empty-state-title">No entities found</div>
		<div class="empty-state-description">
			No entities are linked to this incident yet. Add entities from the toolbar above and link them to timeline activity to turn this view into a usable IOC pivot.
		</div>
	</div>
{:else}
	<div class="entity-view-shell">
		<div class="entity-view-header">
			<div class="view-intro">
				<div class="view-title-row">
					<div class="view-kicker">Entity Pivot</div>
					<div class="view-title">Entities</div>
					<div class="view-count">{totalEntityCount} total</div>
				</div>
				<div class="view-description">Filter linked activity by type. Search matches entities only.</div>
			</div>

			<div class="filter-cluster" role="tablist" aria-label="Related timeline item filter">
				{#each filterOptions as option (option.value)}
					<button
						type="button"
						class="filter-btn"
						class:active={relatedItemFilter === option.value}
						role="tab"
						aria-selected={relatedItemFilter === option.value}
						onclick={() => (relatedItemFilter = option.value)}
					>
						<span>{option.label}</span>
						<span class="filter-count">{getFilterCount(option.value)}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="group-list">
			{#each entityGroups as group (group.groupKey)}
				<section class="entity-group" aria-labelledby={`group-${group.groupKey}`}>
					<header class="group-header">
						<div class="group-title-wrap">
							<div class="group-kicker">Entity Type</div>
							<h2 class="group-title" id={`group-${group.groupKey}`}>{group.groupLabel}</h2>
						</div>
						<div class="group-count">{group.entities.length} entities</div>
					</header>

					<div class="group-entities">
						{#each group.entities as entityNode (entityNode.entity.uuid)}
							<EntityTimelineSection {entityNode} {relatedItemFilter} />
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</div>
{/if}

<style>
	.entity-view-shell {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: 0 0 var(--space-6);
	}

	.entity-view-header {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-root) / 0.96);
		backdrop-filter: blur(8px);
		border-bottom: var(--border-width) solid hsl(var(--border-default));
	}

	.view-intro {
		display: flex;
		flex-direction: column;
		gap: var(--space-0\.5);
		max-width: 48rem;
	}

	.view-title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.view-kicker,
	.group-kicker {
		font-size: var(--text-2xs);
		font-weight: var(--font-semibold);
		line-height: var(--leading-tight);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		color: hsl(var(--brand-default));
	}

	.view-title {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-default));
	}

	.view-count {
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		color: hsl(var(--fg-lighter));
	}

	.view-description {
		font-size: var(--text-xs);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-light));
	}

	.filter-cluster {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-0\.5);
		background: hsl(var(--bg-alternative));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		align-self: center;
	}

	.filter-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		height: 28px;
		padding: 0 var(--space-2);
		border: none;
		border-radius: var(--radius-md);
		background: transparent;
		color: hsl(var(--fg-light));
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.filter-btn:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}

	.filter-btn.active {
		background: hsl(var(--brand-400));
		color: hsl(var(--brand-600));
	}

	.filter-btn:focus-visible,
	.btn-ghost:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.filter-count {
		padding: 0 var(--space-1);
		border-radius: var(--radius-full);
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-data));
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		line-height: 1.4;
	}

	.group-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: 0 var(--space-3);
	}

	.entity-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.group-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-3);
		padding-bottom: var(--space-2);
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
	}

	.group-title-wrap {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.group-title {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-default));
	}

	.group-count {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.group-entities {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

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
		max-width: 34rem;
		line-height: var(--leading-normal);
	}

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
	}

	.btn-ghost:hover {
		background: hsl(var(--bg-surface-200));
		color: hsl(var(--fg-default));
	}

	.btn-sm {
		padding: var(--space-1) var(--space-2);
		font-size: var(--text-xs);
		min-height: 24px;
	}
</style>