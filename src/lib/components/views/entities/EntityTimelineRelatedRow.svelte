<script lang="ts">
	import { api } from '$lib/client';
	import type { EntityType } from '$lib/modals/types';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import { emitIdle, emitViewRow, getUsersOnRow } from '$lib/stores/collabStore';
	import { highlightedItemUuids } from '$lib/stores/cacheStore';
	import { timePreferences } from '$lib/stores/timePreferencesStore';
	import type { EntityTimelineRelatedItem } from '$lib/timeline/core';
	import { formatTimelineTimestampForUi } from '$lib/utils/dateTime';
	import { slide } from 'svelte/transition';
	import TimelineRowDetails from '../default-log/TimelineRowDetails.svelte';

	interface Props {
		relatedItem: EntityTimelineRelatedItem;
	}

	let { relatedItem }: Props = $props();

	let showExpandedDetails = $state(false);
	let columnRatio = $state(0.30);

	const timestampUi = $derived(formatTimelineTimestampForUi(relatedItem.item.timestamp, $timePreferences));
	const usersOnThisRow = $derived($getUsersOnRow(relatedItem.item.uuid));
	const isHighlighted = $derived($highlightedItemUuids.has(relatedItem.item.uuid));
	const isBeingEditedByOther = $derived(
		usersOnThisRow.some((user) => user.editingRow === relatedItem.item.uuid)
	);

	function toggleExpandedDetails() {
		if (showExpandedDetails) {
			showExpandedDetails = false;
			emitIdle();
			return;
		}

		showExpandedDetails = true;
		emitViewRow(relatedItem.item.uuid);
	}

	function handleRowKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleExpandedDetails();
		} else if (event.key === 'Escape' && showExpandedDetails) {
			event.preventDefault();
			showExpandedDetails = false;
			emitIdle();
		}
	}

	function getPrimaryLabel(): string {
		const data = relatedItem.item.data as Record<string, unknown>;
		return relatedItem.item.type === 'event'
			? ((data.event_type as string | undefined) ?? 'Event')
			: ((data.action_type as string | undefined) ?? 'Action');
	}

	function getSummaryText(): string {
		const data = relatedItem.item.data as Record<string, unknown>;
		const detailParts = relatedItem.item.type === 'event'
			? [data.source, data.notes]
			: [data.tool_used, data.notes];
		const summary = detailParts
			.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
			.join(' — ');

		if (!summary) {
			return 'No additional context';
		}

		return summary.length > 180 ? `${summary.slice(0, 177)}...` : summary;
	}

	function randomColorFromString(value: string): string {
		let hash = 0;
		for (let index = 0; index < value.length; index += 1) {
			hash = value.charCodeAt(index) + ((hash << 5) - hash);
		}

		const hue = hash % 360;
		return `hsl(${hue}, 70%, 50%)`;
	}

	function editItem() {
		const entityType: EntityType = relatedItem.item.type === 'event'
			? 'timeline_event'
			: 'investigation_action';
		modalStore.open(createModalConfig(entityType, 'edit', relatedItem.item.data));
	}

	async function deleteItem(uuid: string) {
		if (!confirm('Are you sure you want to delete this item?')) {
			return;
		}

		const incidentId = (relatedItem.item.data as Record<string, unknown>).incident_id as string | undefined;

		try {
			if (relatedItem.item.type === 'event') {
				await api.events.delete(uuid, { incident_id: incidentId });
			} else {
				await api.actions.delete(uuid, { incident_id: incidentId });
			}
		} catch (error) {
			console.error('Error deleting timeline item:', error);
			alert(`Failed to delete ${relatedItem.item.type}: ${(error as Error).message}`);
		}
	}
</script>

<div class="related-row-wrapper" data-timeline-uuid={relatedItem.item.uuid}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="related-row"
		class:highlighted={isHighlighted}
		class:expanded={showExpandedDetails}
		role="button"
		tabindex="0"
		aria-expanded={showExpandedDetails}
		onclick={toggleExpandedDetails}
		onkeydown={handleRowKeydown}
	>
		<div class="row-main">
			<div class="row-timestamp" title={timestampUi.tooltip ?? timestampUi.absolute}>{timestampUi.text}</div>
			<div class="row-content">
				<div class="row-header">
					<span class={`item-type-pill ${relatedItem.item.type}`}>
						{relatedItem.item.type === 'event' ? 'EVENT' : 'ACTION'}
					</span>
					<span class="primary-label">{getPrimaryLabel()}</span>
					{#if relatedItem.relationLabel}
						<span class="relation-pill">{relatedItem.relationLabel}</span>
					{/if}
				</div>
				<div class="row-summary">{getSummaryText()}</div>
			</div>
		</div>

		<div class="row-trailing">
			{#if usersOnThisRow.length > 0}
				<div class="presence-indicators">
					{#each usersOnThisRow as user (user.analystName)}
						<div
							class="user-avatar"
							style:background-color={randomColorFromString(user.analystName)}
							title={user.analystName}
						></div>
					{/each}
				</div>
			{/if}

			<span class="expand-marker">{showExpandedDetails ? '−' : '+'}</span>

			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="row-actions" onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.stopPropagation()}>
				<button
					type="button"
					class="action-btn edit"
					disabled={isBeingEditedByOther}
					title={isBeingEditedByOther ? 'Another user is editing this item' : 'Edit'}
					onclick={editItem}
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
					</svg>
				</button>
				<button
					type="button"
					class="action-btn delete"
					title="Delete"
					onclick={() => deleteItem(relatedItem.item.uuid)}
				>
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M4 4l8 8M12 4l-8 8" />
					</svg>
				</button>
			</div>
		</div>
		{#if showExpandedDetails}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="details-panel" onclick={(event) => event.stopPropagation()} onkeydown={() => {}} transition:slide={{ duration: 180 }}>
				<TimelineRowDetails
					item={relatedItem.item}
					type={relatedItem.item.type}
					bind:columnRatio
					onEdit={editItem}
					onDelete={deleteItem}
				/>
			</div>
		{/if}
	</div>
</div>

<style>
	.related-row-wrapper {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.related-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-3);
		overflow: hidden;
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.related-row:hover {
		background: hsl(var(--bg-surface-200));
		border-color: hsl(var(--border-strong));
	}

	.related-row.expanded,
	.related-row.highlighted {
		border-color: hsl(var(--brand-default));
	}

	.related-row:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.row-main,
	.row-content,
	.row-header,
	.row-trailing,
	.presence-indicators,
	.row-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.row-main {
		min-width: 0;
	}

	.row-content {
		flex: 1;
		flex-direction: column;
		align-items: flex-start;
		min-width: 0;
	}

	.row-header {
		flex-wrap: wrap;
	}

	.row-summary {
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
		line-height: var(--leading-snug);
		word-break: break-word;
	}

	.row-timestamp,
	.primary-label,
	.expand-marker {
		font-family: var(--font-mono);
	}

	.row-timestamp {
		min-width: 56px;
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.primary-label {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-data));
	}

	.item-type-pill,
	.relation-pill {
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 var(--space-2);
		border-radius: var(--radius-full);
		font-size: var(--text-2xs);
		font-weight: var(--font-semibold);
		line-height: var(--leading-none);
		letter-spacing: var(--tracking-wide);
	}

	.item-type-pill.event {
		background: hsl(var(--brand-300));
		color: hsl(var(--brand-600));
	}

	.item-type-pill.action {
		background: hsl(var(--info-200));
		color: hsl(var(--info-600));
	}

	.relation-pill {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--warning-600));
	}

	.row-trailing {
		justify-content: flex-end;
	}

	.expand-marker {
		font-size: var(--text-lg);
		color: hsl(var(--fg-lighter));
	}

	.user-avatar {
		width: 14px;
		height: 14px;
		border-radius: var(--radius-full);
		border: var(--border-width) solid hsl(var(--bg-surface-100));
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: var(--radius-sm);
		background: transparent;
		color: hsl(var(--fg-lighter));
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.action-btn:hover:not(:disabled) {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}

	.action-btn.delete:hover {
		color: hsl(var(--destructive-600));
	}

	.action-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.action-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.details-panel {
		grid-column: 1 / -1;
		margin: 0 calc(var(--space-3) * -1) calc(var(--space-3) * -1);
		overflow: hidden;
	}
</style>