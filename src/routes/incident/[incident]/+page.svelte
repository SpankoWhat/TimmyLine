<script lang="ts">
	// Svelte Imports
	import { onMount, onDestroy} from 'svelte';
	import type { PageProps } from './$types';
	
	// Store Imports
	import {
		currentSelectedIncident,
		combinedTimeline,
		updateIncidentCache
	} from "$lib/stores/cacheStore.js";
    import type { Incident } from '$lib/server/database';
	import TimeLineRow from "$lib/components/TimelineRow.svelte";

	// Socket Stuff
	import { initializeSocket, joinIncident, leaveIncident } from '$lib/stores/socketStore';
	import { type Socket } from 'socket.io-client';
    	
    let { data }: PageProps = $props();
	let socket: Socket | null = null;
    
	
	onMount(() => {
		let incidentObj = data.incident as Incident;
		if (!incidentObj) {
			console.warn('No incident data found from server for incident uuid:', incidentObj);
			return;
		}
		
		currentSelectedIncident.set(incidentObj);
		
		// Initialize Socket Connection incase not already done and join
		initializeSocketListeners();

		if (socket && $currentSelectedIncident?.uuid) {
			joinIncident($currentSelectedIncident.uuid);
		}
		
	});

	onDestroy(() => {
		// Leave incident room before disconnecting
        if (socket && $currentSelectedIncident) {
			leaveIncident($currentSelectedIncident.uuid);
        }
		$currentSelectedIncident = null;
        socket?.disconnect();
	});

	function initializeSocketListeners() {
		socket = initializeSocket();

		// Set up socket event listeners
		// This is very crude - ideally we would have more granular events core-entry-modified
		socket?.on('core-entry-modified', async () => {
			console.log('An update to core tables is available');
			if (!$currentSelectedIncident) {
				console.warn('No currentSelectedIncident set, skipping updateIncidentCache');
				return;
			}
			await updateIncidentCache($currentSelectedIncident);
		});
	}

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
					{#each $combinedTimeline as item, index}
						<TimeLineRow {item} {index} />
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