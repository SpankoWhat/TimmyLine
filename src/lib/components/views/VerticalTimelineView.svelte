<script lang="ts">
	import { processTimelineItems, type TimelineItem } from '$lib/timeline/core';
	import type { DisplayFieldsConfiguration } from '$lib/config/displayFieldsConfig';
	import { timePreferences } from '$lib/stores/timePreferencesStore';
	import { formatTimelineTimestampForUi } from '$lib/utils/dateTime';

	import TimelineCard from './vertical-timeline/TimelineCard.svelte';
	import TimelineGap from './vertical-timeline/TimelineGap.svelte';
	import TimelineDateSeparator from './vertical-timeline/TimelineDateSeparator.svelte';
	import TimelineCluster from './vertical-timeline/TimelineCluster.svelte';

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

	// ── Derived Processed Items ────────────────────────────────────────────

	let processedNodes = $derived(processTimelineItems(items, $timePreferences.timezone));
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
			No timeline items matched your search. Try a different query or
			<button class="btn-ghost btn-sm" onclick={onClearSearch}>clear the search</button>.
		</div>
	</div>
{:else if totalItemCount === 0}
	<div class="empty-state">
		<span class="empty-state-icon">📊</span>
		<div class="empty-state-title">No timeline data found</div>
		<div class="empty-state-description">
			No timeline events or investigation actions found for this incident. Use the toolbar above
			to add events, actions, entities, or annotations.
		</div>
	</div>
{:else}
	<ol class="vertical-timeline" role="list" aria-label="Incident timeline">
		{#each processedNodes as node, idx (idx)}
			{#if node.kind === 'date-separator'}
				<li class="timeline-node separator-node" role="separator">
					<TimelineDateSeparator dateKey={node.dateKey} epoch={node.anchorEpoch} />
				</li>
			{:else if node.kind === 'gap'}
				<li class="timeline-node gap-node">
					<div class="node-timestamp-spacer"></div>
					<div class="node-spine">
						<div class="spine-line dashed"></div>
					</div>
					<div class="node-content">
						<TimelineGap durationSeconds={node.durationSeconds} />
					</div>
				</li>
			{:else if node.kind === 'cluster'}
				<li class="timeline-node cluster-node">
					<div class="node-timestamp-spacer"></div>
					<div class="node-spine">
						<div class="spine-dot cluster-dot"></div>
						<div class="spine-line"></div>
					</div>
					<div class="node-content">
						<TimelineCluster
							items={node.items}
							{displayFieldsConfig}
							durationSeconds={node.durationSeconds}
						/>
					</div>
				</li>
			{:else if node.kind === 'item'}
				{@const nodeTimestampUi = formatTimelineTimestampForUi(node.item.timestamp, $timePreferences)}
				<li class="timeline-node item-node">
					<div class="node-timestamp" title={nodeTimestampUi.tooltip ?? nodeTimestampUi.absolute}>
						{nodeTimestampUi.text}
					</div>
					<div class="node-spine">
						{#if node.item.type === 'event'}
							<div class="spine-dot event-dot"></div>
						{:else}
							<div class="spine-dot action-dot"></div>
						{/if}
						<div class="spine-line"></div>
					</div>
					<div class="node-content">
						<TimelineCard item={node.item} {displayFieldsConfig} />
					</div>
				</li>
			{/if}
		{/each}
	</ol>
{/if}

<style>
	/* ===== Vertical Timeline Container ===== */
	.vertical-timeline {
		display: flex;
		flex-direction: column;
		list-style: none;
		padding: var(--space-4) 0;
		margin: 0;
	}

	/* ===== Timeline Node (each row in the timeline) ===== */
	.timeline-node {
		display: grid;
		grid-template-columns: 50px 32px 1fr;
		align-items: start;
		min-height: 0;
	}

	/* Separator nodes span full width */
	.timeline-node.separator-node {
		display: block;
		padding: 0 var(--space-3);
	}

	/* ===== Timestamp ===== */
	.node-timestamp {
		padding-top: var(--space-2);
		padding-right: var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		text-align: right;
		white-space: nowrap;
		line-height: var(--leading-tight);
	}

	.node-timestamp-spacer {
		/* Spacer to maintain grid alignment for non-item nodes */
		display: block;
	}

	/* ===== Spine (vertical line + dots) ===== */
	.node-spine {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		min-height: 100%;
	}

	.spine-dot {
		position: relative;
		z-index: 1;
		width: 10px;
		height: 10px;
		margin-top: var(--space-2);
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.spine-dot.event-dot {
		background: hsl(var(--brand-default));
	}

	.spine-dot.action-dot {
		background: hsl(var(--info-default));
		border-radius: var(--radius-xs);
		transform: rotate(45deg);
		width: 9px;
		height: 9px;
	}

	.spine-dot.cluster-dot {
		background: hsl(var(--fg-lighter));
		width: 8px;
		height: 8px;
	}

	.spine-line {
		flex: 1;
		width: var(--border-width-thick);
		background: hsl(var(--border-default));
		min-height: var(--space-4);
	}

	.spine-line.dashed {
		background: none;
		border-left: var(--border-width) dashed hsl(var(--border-default));
		width: 0;
		min-height: var(--space-6);
	}

	/* ===== Node Content ===== */
	.node-content {
		padding: var(--space-1) 0 var(--space-3) var(--space-3);
	}

	/* ===== Empty State ===== */
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

	/* ===== Button Styles ===== */
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

	.btn-sm {
		padding: var(--space-1) var(--space-2);
		font-size: var(--text-xs);
		min-height: 24px;
	}

	/* ===== Reduced Motion ===== */
	@media (prefers-reduced-motion: reduce) {
		.spine-dot,
		.spine-line {
			transition-duration: 0.01ms !important;
		}
	}
</style>
