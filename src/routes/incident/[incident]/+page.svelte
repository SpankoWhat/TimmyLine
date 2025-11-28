<script lang="ts">
	// Svelte Imports
	import { onMount, onDestroy, getContext} from 'svelte';
	import type { PageProps } from './$types';
	
	// Store Imports
	import { currentSelectedIncident, combinedTimeline, currentSelectedAnalyst, initializeAllCaches } from "$lib/stores/cacheStore.js";
	import { initializeSocket, joinIncident, leaveIncident, disconnectSocket } from "$lib/stores/collabStore.js";
    import type { Incident } from '$lib/server/database';
	
	// Prop Imports
	import TimeLineRow from "$lib/components/TimelineRow.svelte";
	import IncidentStats from '$lib/components/IncidentStats.svelte';
	import IncidentPageActions from '$lib/components/IncidentPageActions.svelte';
	
    let { data }: PageProps = $props();
	let { register, unregister } : any = getContext('dynamicLayoutSlots');
	
	onMount(() => {
		let incidentObj = data.incident as Incident;
		if (!incidentObj) {
			console.warn('No incident data found from server for incident uuid:', incidentObj);
			return;
		}
		currentSelectedIncident.set(incidentObj);

		initializeAllCaches();
		
		// Now analyst is guaranteed to be set
		if (initializeSocket() && $currentSelectedIncident?.uuid && $currentSelectedAnalyst?.uuid) {
			console.log('Socket initialized successfully. Joining incident room...');
			joinIncident();
		} else {
			console.error('Socket initialization failed.');
		}

		document.title = `Incident - ${$currentSelectedIncident?.title} - TimmyLine`;
		register('stats', IncidentStats);
		register('actions', IncidentPageActions);

	});
	
	onDestroy(() => {
		$currentSelectedIncident = null;
		unregister('stats');
		unregister('actions');
		leaveIncident();
		disconnectSocket();
	});
</script>

<div class="incident-page">
	<!-- Timeline Events -->
	<div class="timeline-section">
		<div class="section-header">Timeline Events</div>
		<div class="section-content">
			{#if !$currentSelectedIncident?.uuid}
				<div class="empty-state warning">
					<span class="empty-icon">⚠</span>
					<div class="empty-title">No incident selected</div>
					<div class="empty-description">Select an active incident to view timeline events.</div>
				</div>
			{:else if $combinedTimeline.length === 0}
				<div class="empty-state info">
					<span class="empty-icon">📊</span>
					<div class="empty-title">No timeline data found</div>
					<div class="empty-description">No timeline events or investigation actions found for this incident.</div>
				</div>
			{:else}
				<div class="timeline-list">
					{#each $combinedTimeline as item}
						<TimeLineRow {item} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.incident-page {
		min-height: 100vh;
		padding-top: var(--header-height);
		max-width: 1400px;
		margin: 0 auto;
	}

	.timeline-section {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
	}

	.section-header {
		padding: var(--spacing-md) var(--spacing-lg);
		border-bottom: 1px solid var(--color-border-subtle);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section-content {
		padding: var(--spacing-md);
	}

	.timeline-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		max-height: calc(100vh - 350px);
		overflow-y: auto;
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-2xl);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
	}

	.empty-icon {
		font-size: 2rem;
		margin-bottom: var(--spacing-md);
		display: block;
	}

	.empty-title {
		font-size: var(--font-size-base);
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xs);
	}

	.empty-description {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
	}

	.empty-state.warning .empty-icon {
		color: var(--color-accent-warning);
	}

	.empty-state.warning .empty-title {
		color: var(--color-accent-warning);
	}

	.empty-state.info .empty-icon {
		color: var(--color-accent-primary);
	}

	.empty-state.info .empty-title {
		color: var(--color-accent-primary);
	}
</style>