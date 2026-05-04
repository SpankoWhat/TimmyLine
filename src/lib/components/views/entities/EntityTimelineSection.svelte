<script lang="ts">
	import type { EntityTimelineEntityNode, EntityTimelineItemFilter } from '$lib/timeline/core';
	import { entityTypes } from '$lib/stores/cacheStore';
	import { timePreferences } from '$lib/stores/timePreferencesStore';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import { formatTimestampForUi } from '$lib/utils/dateTime';
	import EntityTimelineRelatedRow from './EntityTimelineRelatedRow.svelte';

	interface Props {
		entityNode: EntityTimelineEntityNode;
		relatedItemFilter: EntityTimelineItemFilter;
	}

	let { entityNode, relatedItemFilter }: Props = $props();

	let expanded = $state(false);

	const visibleRelatedItems = $derived.by(() => {
		return entityNode.relatedItems.filter((relatedItem) => {
			if (relatedItemFilter === 'both') {
				return true;
			}
			return relatedItemFilter === 'events'
				? relatedItem.item.type === 'event'
				: relatedItem.item.type === 'action';
		});
	});

	const entityTypeLabel = $derived.by(() => {
		const found = $entityTypes.find((entityType) => entityType.name === entityNode.entity.entity_type);
		return found?.name || entityNode.entity.entity_type || 'Unknown';
	});

	const tags = $derived.by(() => {
		return (entityNode.entity.tags ?? '')
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean);
	});

	const visibleTags = $derived.by(() => tags.slice(0, 3));
	const hiddenTagCount = $derived.by(() => Math.max(0, tags.length - visibleTags.length));

	function formatSeen(epoch: number | null): string | null {
		if (!epoch) {
			return null;
		}

		return formatTimestampForUi(epoch, $timePreferences).text;
	}

	function toggleExpanded() {
		expanded = !expanded;
	}

	function handleSummaryKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleExpanded();
		}
	}

	function editEntity(event: MouseEvent) {
		event.stopPropagation();
		modalStore.open(createModalConfig('entity', 'edit', entityNode.entity));
	}

	function statusClass(status: string | null): string {
		switch (status) {
			case 'active':
				return 'status-active';
			case 'inactive':
				return 'status-inactive';
			default:
				return 'status-unknown';
		}
	}

	function criticalityClass(criticality: string | null): string {
		switch (criticality) {
			case 'critical':
				return 'criticality-critical';
			case 'high':
				return 'criticality-high';
			case 'medium':
				return 'criticality-medium';
			case 'low':
				return 'criticality-low';
			default:
				return 'criticality-unknown';
		}
	}
</script>

<section class="entity-section" class:expanded={expanded}>
	<div
		class="entity-summary"
		role="button"
		tabindex="0"
		aria-expanded={expanded}
		onclick={toggleExpanded}
		onkeydown={handleSummaryKeydown}
	>
		<div class="summary-leading">
			<div class="summary-title-row">
				<span class="expand-indicator">{expanded ? '▼' : '▶'}</span>
				<span class="entity-identifier">{entityNode.entity.identifier}</span>
				{#if entityNode.entity.display_name && entityNode.entity.display_name !== entityNode.entity.identifier}
					<span class="entity-display-name">{entityNode.entity.display_name}</span>
				{/if}
			</div>

			<div class="summary-meta-row">
				<span class="type-pill">{entityTypeLabel}</span>
				{#if entityNode.entity.status}
					<span class={`meta-pill ${statusClass(entityNode.entity.status)}`}>{entityNode.entity.status}</span>
				{/if}
				{#if entityNode.entity.criticality}
					<span class={`meta-pill ${criticalityClass(entityNode.entity.criticality)}`}>{entityNode.entity.criticality}</span>
				{/if}
				{#if formatSeen(entityNode.entity.first_seen)}
					<span class="meta-text">First {formatSeen(entityNode.entity.first_seen)}</span>
				{/if}
				{#if formatSeen(entityNode.entity.last_seen)}
					<span class="meta-text">Last {formatSeen(entityNode.entity.last_seen)}</span>
				{/if}
				{#each visibleTags as tag (tag)}
					<span class="tag-pill">#{tag}</span>
				{/each}
				{#if hiddenTagCount > 0}
					<span class="tag-pill tag-pill-muted">+{hiddenTagCount}</span>
				{/if}
			</div>
		</div>

		<div class="summary-trailing">
			<div class="count-card">
				<div class="count-value">{entityNode.relatedCounts.total}</div>
				<div class="count-label">linked</div>
			</div>
			<div class="count-split">E {entityNode.relatedCounts.events} / A {entityNode.relatedCounts.actions}</div>
			<button type="button" class="edit-btn" onclick={editEntity}>Edit</button>
		</div>
	</div>

	{#if expanded}
		<div class="entity-body">
			{#if visibleRelatedItems.length === 0}
				<div class="empty-related-state">
					No {relatedItemFilter === 'both' ? 'related timeline activity' : relatedItemFilter} matched the current filter.
				</div>
			{:else}
				<div class="related-list">
					{#each visibleRelatedItems as relatedItem (`${relatedItem.item.uuid}:${relatedItem.relationLabel ?? 'none'}`)}
						<EntityTimelineRelatedRow {relatedItem} />
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.entity-section {
		display: flex;
		flex-direction: column;
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: var(--transition-colors);
	}

	.entity-section.expanded {
		border-color: hsl(var(--border-stronger));
		box-shadow: inset 0 1px 0 hsl(var(--brand-300));
	}

	.entity-summary {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		cursor: pointer;
		background: linear-gradient(180deg, hsl(var(--bg-surface-200)) 0%, hsl(var(--bg-surface-100)) 100%);
	}

	.entity-summary:hover {
		background: linear-gradient(180deg, hsl(var(--bg-surface-300)) 0%, hsl(var(--bg-surface-200)) 100%);
	}

	.entity-summary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: -1px;
	}

	.summary-leading,
	.summary-trailing {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}

	.summary-leading {
		flex-direction: column;
		min-width: 0;
	}

	.summary-trailing {
		align-items: center;
		gap: var(--space-3);
	}

	.summary-title-row,
	.summary-meta-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.expand-indicator,
	.entity-identifier,
	.count-value,
	.count-split {
		font-family: var(--font-mono);
	}

	.expand-indicator {
		color: hsl(var(--brand-default));
		font-size: var(--text-xs);
	}

	.entity-identifier {
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-data));
		word-break: break-word;
	}

	.entity-display-name {
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
	}

	.type-pill,
	.meta-pill,
	.tag-pill {
		display: inline-flex;
		align-items: center;
		height: 22px;
		padding: 0 var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--text-2xs);
		font-weight: var(--font-medium);
		line-height: var(--leading-none);
	}

	.type-pill {
		background: hsl(var(--brand-300));
		color: hsl(var(--brand-600));
	}

	.meta-pill,
	.tag-pill {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-light));
	}

	.tag-pill {
		font-family: var(--font-mono);
	}

	.tag-pill-muted {
		color: hsl(var(--fg-lighter));
	}

	.meta-text {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.status-active {
		background: hsl(var(--success-200));
		color: hsl(var(--success-600));
	}

	.status-inactive {
		background: hsl(var(--destructive-200));
		color: hsl(var(--destructive-600));
	}

	.status-unknown,
	.criticality-unknown {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-light));
	}

	.criticality-critical {
		background: hsl(var(--destructive-300));
		color: hsl(var(--destructive-600));
	}

	.criticality-high {
		background: hsl(var(--warning-300));
		color: hsl(var(--warning-600));
	}

	.criticality-medium {
		background: hsl(var(--info-200));
		color: hsl(var(--info-600));
	}

	.criticality-low {
		background: hsl(var(--success-200));
		color: hsl(var(--success-600));
	}

	.count-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 52px;
		padding: var(--space-1) var(--space-2);
		background: hsl(var(--bg-alternative));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
	}

	.count-value {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
	}

	.count-label {
		font-size: var(--text-2xs);
		color: hsl(var(--fg-lighter));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.count-split {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.edit-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 28px;
		padding: 0 var(--space-3);
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		background: hsl(var(--bg-alternative));
		color: hsl(var(--fg-light));
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.edit-btn:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}

	.edit-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.entity-body {
		padding: 0 var(--space-4) var(--space-4);
		background: hsl(var(--bg-surface-75));
	}

	.related-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.empty-related-state {
		padding: var(--space-4);
		border: var(--border-width) dashed hsl(var(--border-default));
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: hsl(var(--fg-lighter));
		background: hsl(var(--bg-alternative));
	}
</style>