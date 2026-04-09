<script lang="ts">
	import type { TimelineItem } from '$lib/stores/cacheStore';
	import type { DisplayFieldsConfiguration } from '$lib/config/displayFieldsConfig';
	import type { TimelineEvent } from '$lib/types/events';
	import type { InvestigationAction } from '$lib/types/actions';
	import { timePreferences } from '$lib/stores/timePreferencesStore';
	import { formatTimelineTimestampForUi } from '$lib/utils/dateTime';

	interface Props {
		items: TimelineItem[];
		displayFieldsConfig: DisplayFieldsConfiguration;
		durationSeconds: number;
	}

	let { items, displayFieldsConfig, durationSeconds }: Props = $props();

	let expanded = $state(false);

	function toggle() {
		expanded = !expanded;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle();
		}
	}

	function formatDuration(seconds: number): string {
		if (seconds < 60) {
			return `${Math.round(seconds)}s`;
		}
		if (seconds < 3600) {
			const m = Math.floor(seconds / 60);
			const s = Math.round(seconds % 60);
			return s > 0 ? `${m}m ${s}s` : `${m}m`;
		}
		const h = Math.floor(seconds / 3600);
		const m = Math.round((seconds % 3600) / 60);
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	function getItemLabel(item: TimelineItem): string {
		if (item.type === 'event') {
			const ev = item.data as TimelineEvent;
			return ev.source ?? ev.notes ?? ev.uuid.slice(0, 8);
		}
		const act = item.data as InvestigationAction;
		return act.tool_used ?? act.result ?? act.uuid.slice(0, 8);
	}

	function getItemTypeLabel(item: TimelineItem): string {
		if (item.type === 'event') {
			return (item.data as TimelineEvent).event_type;
		}
		return (item.data as InvestigationAction).action_type;
	}

	const formattedDuration = $derived(formatDuration(durationSeconds));
	const itemCount = $derived(items.length);
</script>

<div class="timeline-cluster" class:expanded>
	<button
		class="cluster-header"
		aria-expanded={expanded}
		onclick={toggle}
		onkeydown={handleKeydown}
	>
		<!-- Stack/layers icon -->
		<svg
			class="cluster-icon"
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<polygon points="12 2 2 7 12 12 22 7 12 2" />
			<polyline points="2 17 12 22 22 17" />
			<polyline points="2 12 12 17 22 12" />
		</svg>
		<span class="cluster-count">{itemCount} items</span>
		<span class="cluster-duration">in {formattedDuration}</span>
		<!-- Chevron icon -->
		<svg
			class="cluster-chevron"
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<polyline points="6 9 12 15 18 9" />
		</svg>
	</button>

	{#if expanded}
		<div class="cluster-items">
			{#each items as item (item.uuid)}
				{@const itemTimestampUi = formatTimelineTimestampForUi(item.timestamp, $timePreferences)}
				<div class="cluster-item">
					<span class="cluster-item-time" title={itemTimestampUi.tooltip ?? itemTimestampUi.absolute}>{itemTimestampUi.text}</span>
					<span class="cluster-item-type">{getItemTypeLabel(item)}</span>
					<span class="cluster-item-label">{getItemLabel(item)}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.timeline-cluster {
		display: flex;
		flex-direction: column;
		padding: var(--space-1) 0;
	}

	.cluster-header {
		/* Button reset */
		appearance: none;
		background: none;
		border: none;
		margin: 0;
		padding: 0;
		font: inherit;
		text-align: inherit;

		/* Layout */
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-3);
		align-self: center;

		/* Visual */
		background: hsl(var(--bg-surface-200));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-full);

		/* Typography */
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-light));

		/* Interaction */
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.cluster-header:hover {
		background: hsl(var(--bg-surface-300));
		border-color: hsl(var(--border-strong));
	}

	.cluster-header:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.cluster-icon {
		flex-shrink: 0;
		color: hsl(var(--fg-lighter));
	}

	.cluster-count {
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
	}

	.cluster-duration {
		color: hsl(var(--fg-lighter));
	}

	.cluster-chevron {
		flex-shrink: 0;
		transition: transform var(--transition-colors);
	}

	.expanded .cluster-chevron {
		transform: rotate(180deg);
	}

	.cluster-items {
		display: flex;
		flex-direction: column;
		gap: var(--space-0\.5);
		padding: var(--space-2) 0 0;
	}

	.cluster-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-0\.5) var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}

	.cluster-item-time {
		color: hsl(var(--fg-lighter));
		flex-shrink: 0;
	}

	.cluster-item-type {
		color: hsl(var(--brand-default));
		text-transform: uppercase;
		font-weight: var(--font-medium);
		flex-shrink: 0;
	}

	.cluster-item-label {
		color: hsl(var(--fg-data));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.cluster-header,
		.cluster-chevron {
			transition-duration: 0.01ms !important;
		}
	}
</style>
