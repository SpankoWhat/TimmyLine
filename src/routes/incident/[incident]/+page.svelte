<script lang="ts">
	// Svelte Imports
	import { onMount, onDestroy, getContext} from 'svelte';
	import type { PageProps } from './$types';
	
	// Store Imports
	import { currentSelectedIncident, combinedTimeline, currentSelectedAnalyst, initializeAllCaches, showDeletedItems} from "$lib/stores/cacheStore.js";
	import { initializeSocket, joinIncidentSocket, leaveIncidentSocket, disconnectSocket } from "$lib/stores/collabStore.js";
    import type { Incident } from '$lib/server/database';
	
	// Prop Imports
	import TimeLineRow from "$lib/components/TimelineRow.svelte";
	import IncidentStats from '$lib/components/IncidentStats.svelte';
	import IncidentPageActions from '$lib/components/IncidentPageActions.svelte';
	import ActiveUsersIndicator from '$lib/components/ActiveUsersIndicator.svelte';
	import { displayFieldsConfig } from '$lib/config/displayFieldsConfig';
	
    let { data }: PageProps = $props();
	let { register, unregister } : any = getContext('dynamicLayoutSlots');

	// Track selected fields and their pinned state for each type (event/action) independently
	let fieldStates = $state({
		event: displayFieldsConfig.event.map(f => ({ ...f })),
		action: displayFieldsConfig.action.map(f => ({ ...f }))
	});

	let showFieldSelector = $state(false);

	// Compute filtered field configs based on selected fields (visible fields only)
	const filteredDisplayFieldsConfig = $derived({
		event: fieldStates.event,
		action: fieldStates.action
	});

	function toggleFieldPinned(type: 'event' | 'action', fieldKey: string) {
		const field = fieldStates[type].find(f => f.key === fieldKey);
		if (field) {
			field.pinned = !field.pinned;
		}
	}

	function resetFieldSelection() {
		fieldStates = {
			event: displayFieldsConfig.event.map(f => ({ ...f })),
			action: displayFieldsConfig.action.map(f => ({ ...f }))
		};
	}
	
	onMount(() => {
		let incidentObj = data.incident as Incident;
		if (!incidentObj) {
			console.warn('No incident data found from server for incident uuid:', incidentObj);
			return;
		}

		//Setting the current selected incident in the cache store
		currentSelectedIncident.set(incidentObj);
		initializeAllCaches();
		
		// Check and initialize socket connection
		if (!initializeSocket() && !$currentSelectedIncident?.uuid && !$currentSelectedAnalyst?.uuid) {
			console.warn('Socket initialization skipped');
		}
		
		
		document.title = `Incident - ${$currentSelectedIncident?.title}`;
		joinIncidentSocket();
		
		register('stats', IncidentStats);
		register('actions', IncidentPageActions);
		register('userActivity', ActiveUsersIndicator);

	});
	
	onDestroy(() => {
		$currentSelectedIncident = null;
		unregister('stats');
		unregister('actions');
		leaveIncidentSocket();
		disconnectSocket();
	});

	function toggleShowDeleted() {
		showDeletedItems.update(val => !val);
	}
</script>

<div class="incident-page">
	<!-- Timeline Events -->
	<div class="timeline-section">
		<div class="section-header">
			Timeline Events
			<div class="header-actions">
				<button class="toggle-deleted-btn" onclick={toggleShowDeleted}>
					{#if $showDeletedItems}
						Hide Deleted Items
					{:else}
						Show Deleted Items
					{/if}
				</button>
				<div class="field-selector-container">
					<button class="field-selector-btn" onclick={() => showFieldSelector = !showFieldSelector} title="Select visible fields">
						⚙
					</button>
					{#if showFieldSelector}
						<div class="field-selector-dropdown" onclick={(e) => e.stopPropagation()}>
							<!-- Events Fields -->
							<div class="field-section">
								<div class="field-section-title">Event Fields</div>
								<div class="field-list">
									{#each displayFieldsConfig.event as field}
										{#if !field.hideFromUser}
											<div class="field-row">
												<label class="field-checkbox-label">
													<input 
														type="checkbox" 
														checked={field.pinned}
														onchange={() => toggleFieldPinned('event', field.key)}
													/>
													<span>{field.label}</span>
												</label>
											</div>
										{/if}
									{/each}
								</div>
							</div>

							<!-- Actions Fields -->
							<div class="field-section">
								<div class="field-section-title">Action Fields</div>
								<div class="field-list">
									{#each displayFieldsConfig.action as field}
										{#if !field.hideFromUser}
											<div class="field-row">
												<label class="field-checkbox-label">
													<input 
														type="checkbox" 
														checked={field.pinned}
														onchange={() => toggleFieldPinned('action', field.key)}
													/>
													<span>{field.label}</span>
												</label>
											</div>
										{/if}
									{/each}
								</div>
							</div>

							<button class="reset-btn" onclick={resetFieldSelection}>Reset to Default</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
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
					{#each $combinedTimeline as item (item.uuid)}
						<TimeLineRow {item} displayFieldsConfig={filteredDisplayFieldsConfig}/>
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
		padding-bottom: var(--spacing-2xl);
	}

	.section-header {
		padding: var(--spacing-xs) var(--spacing-xs);
		border-bottom: 1px solid var(--color-border-subtle);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-actions {
		display: flex;
		gap: var(--spacing-xs);
		align-items: center;
	}

	.toggle-deleted-btn {
		background: none;
		border: none;
		color: var(--color-accent-primary);
		cursor: pointer;
		font-size: var(--font-size-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--border-radius-sm);
		transition: background 0.2s;
	}

	.toggle-deleted-btn:hover {
		background: rgba(0, 255, 0, 0.1);
	}

	.field-selector-container {
		position: relative;
	}

	.field-selector-btn {
		background: none;
		border: 1px solid var(--color-border-medium);
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: var(--font-size-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--border-radius-sm);
		transition: all 0.2s;
		height: 24px;
		width: 24px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.field-selector-btn:hover {
		border-color: var(--color-accent-primary);
		color: var(--color-accent-primary);
		background: rgba(0, 255, 0, 0.1);
	}

	.field-selector-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		padding: var(--spacing-sm);
		margin-top: var(--spacing-xs);
		z-index: 100;
		min-width: 250px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.field-section {
		margin-bottom: var(--spacing-sm);
	}

	.field-section:last-of-type {
		margin-bottom: var(--spacing-md);
	}

	.field-section-title {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-accent-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--spacing-xs);
		padding-bottom: var(--spacing-xs);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.field-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		justify-content: space-between;
	}

	.field-checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		cursor: pointer;
		font-size: var(--font-size-xs);
		color: var(--color-text-primary);
		user-select: none;
		transition: background 0.2s;
		padding: var(--spacing-xs) calc(var(--spacing-xs) / 2);
		border-radius: var(--border-radius-sm);
		flex: 1;
	}

	.field-checkbox-label:hover {
		background: var(--color-bg-hover);
	}

	.field-checkbox-label input[type="checkbox"] {
		cursor: pointer;
		accent-color: var(--color-accent-primary);
	}

	.pin-toggle-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: var(--font-size-sm);
		padding: 0;
		color: var(--color-text-secondary);
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: var(--border-radius-sm);
	}

	.pin-toggle-btn:hover {
		background: var(--color-bg-hover);
		color: var(--color-accent-primary);
	}

	.pin-toggle-btn.pinned {
		color: var(--color-accent-primary);
	}

	.reset-btn {
		width: 100%;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: var(--font-size-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		border-radius: var(--border-radius-sm);
		transition: all 0.2s;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.reset-btn:hover {
		border-color: var(--color-accent-primary);
		color: var(--color-accent-primary);
		background: rgba(0, 255, 0, 0.05);
	}

	.section-content {
		padding: var(--spacing-xs);
		height: fit-content;
	}

	.timeline-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
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