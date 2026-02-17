<script lang="ts">
	// Svelte Imports
	import { onMount, onDestroy, getContext} from 'svelte';
	import type { PageProps } from './$types';
	
	// Store Imports
	import { currentSelectedIncident, combinedTimeline, initializeAllCaches, showDeletedItems, clearHighlights} from "$lib/stores/cacheStore.js";
	import { joinIncidentSocket, leaveIncidentSocket } from "$lib/stores/collabStore.js";
    import type { Incident } from '$lib/server/database';
	
	// Prop Imports
	import TimeLineRow from "$lib/components/TimelineRow.svelte";
	import IncidentStats from '$lib/components/IncidentStats.svelte';
	import IncidentPageActions from '$lib/components/IncidentPageActions.svelte';
	import ActiveUsersIndicator from '$lib/components/ActiveUsersIndicator.svelte';
	import EntitiesAnnotationsPanel from '$lib/components/EntitiesAnnotationsPanel.svelte';
	import FieldSelectorPanel from '$lib/components/FieldSelectorPanel.svelte';
	import { displayFieldsConfig } from '$lib/config/displayFieldsConfig';
	import type { DisplayField } from '$lib/config/displayFieldsConfig';
	import { loadFieldPreferences, clearFieldPreferences } from '$lib/utils/fieldPreferences';

    let { data }: PageProps = $props();
	let { register, unregister } : any = getContext('dynamicLayoutSlots');

	// Simplified field states — starts with defaults, hydrated from localStorage in onMount
	let fieldStates = $state<{
		event: DisplayField[];
		action: DisplayField[];
	}>({
		event: displayFieldsConfig.event.map(f => ({ ...f })),
		action: displayFieldsConfig.action.map(f => ({ ...f }))
	});

	let showFieldSelector = $state(false);
	let showEntitiesPanel = $state(false);

	// References to panel components for reset
	let eventPanelRef: FieldSelectorPanel | undefined = $state();
	let actionPanelRef: FieldSelectorPanel | undefined = $state();

	// Compute filtered field configs based on field states (for passing to TimelineRow)
	const filteredDisplayFieldsConfig = $derived({
		event: [...fieldStates.event].sort((a, b) => a.order - b.order),
		action: [...fieldStates.action].sort((a, b) => a.order - b.order)
	});

	function handleFieldStatesChange(type: 'event' | 'action', fields: DisplayField[]) {
		fieldStates[type] = fields;
	}

	function resetFieldSelection() {
		clearFieldPreferences('event');
		clearFieldPreferences('action');
		if (eventPanelRef) {
			eventPanelRef.resetFieldSelection();
		} else {
			fieldStates.event = displayFieldsConfig.event.map(f => ({ ...f }));
		}
		if (actionPanelRef) {
			actionPanelRef.resetFieldSelection();
		} else {
			fieldStates.action = displayFieldsConfig.action.map(f => ({ ...f }));
		}
	}
	
	onMount(() => {
		// Hydrate field preferences from localStorage (client-only)
		const loadedEvent = loadFieldPreferences('event', displayFieldsConfig.event);
		const loadedAction = loadFieldPreferences('action', displayFieldsConfig.action);
		console.log('[FieldPrefs] Raw localStorage event:', localStorage.getItem('timmyline:fieldPrefs:event'));
		console.log('[FieldPrefs] Loaded event fields:', loadedEvent.map(f => ({ key: f.key, pinned: f.pinned, order: f.order })));
		console.log('[FieldPrefs] Loaded action fields:', loadedAction.map(f => ({ key: f.key, pinned: f.pinned, order: f.order })));
		fieldStates.event = loadedEvent;
		fieldStates.action = loadedAction;

		let incidentObj = data.incident as Incident;
		if (!incidentObj) {
			console.warn('No incident data found from server for incident uuid:', incidentObj);
			return;
		}

		//Setting the current selected incident in the cache store
		currentSelectedIncident.set(incidentObj);
		initializeAllCaches();
		
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
		unregister('userActivity');
		leaveIncidentSocket();
		clearHighlights();
	});

	function toggleShowDeleted() {
		showDeletedItems.update(val => !val);
	}

	function toggleEntitiesPanel() {
		showEntitiesPanel = !showEntitiesPanel;
		if (!showEntitiesPanel) {
			clearHighlights();
		}
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
				<div class="entities-panel-container">
					<button 
						class="entities-panel-btn" 
						class:active={showEntitiesPanel}
						onclick={toggleEntitiesPanel} 
						title="View all entities and annotations"
					>
						◆
					</button>
					{#if showEntitiesPanel}
						<div class="entities-panel-dropdown" onclick={(e) => e.stopPropagation()}>
							<EntitiesAnnotationsPanel />
						</div>
					{/if}
				</div>
				<div class="field-selector-container">
					<button class="field-selector-btn" onclick={() => showFieldSelector = !showFieldSelector} title="Select visible fields">
						⚙
					</button>
					{#if showFieldSelector}
						<div class="field-selector-dropdown" onclick={(e) => e.stopPropagation()}>
							<div class="field-selector-panels">
								<!-- Events Fields -->
								<FieldSelectorPanel
									bind:this={eventPanelRef}
									title="Event Fields"
									type="event"
									timelineItems={$combinedTimeline}
									staticFieldConfig={displayFieldsConfig.event}
									onfieldstateschange={(fields) => handleFieldStatesChange('event', fields)}
								/>

								<!-- Actions Fields -->
								<FieldSelectorPanel
									bind:this={actionPanelRef}
									title="Action Fields"
									type="action"
									timelineItems={$combinedTimeline}
									staticFieldConfig={displayFieldsConfig.action}
									onfieldstateschange={(fields) => handleFieldStatesChange('action', fields)}
								/>
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

	/* Entities/Annotations Panel */
	.entities-panel-container {
		position: relative;
	}

	.entities-panel-btn {
		background: none;
		border: 1px solid var(--color-border-medium);
		color: var(--color-text-secondary);
		cursor: pointer;
		font-size: var(--font-size-sm);
		border-radius: var(--border-radius-sm);
		transition: all 0.2s;
		height: 24px;
		width: 24px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.entities-panel-btn:hover {
		border-color: var(--color-accent-warning);
		color: var(--color-accent-warning);
		background: rgba(251, 191, 36, 0.1);
	}

	.entities-panel-btn.active {
		border-color: var(--color-accent-warning);
		color: var(--color-accent-warning);
		background: rgba(251, 191, 36, 0.15);
	}

	.entities-panel-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: var(--spacing-xs);
		z-index: 50;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
		padding: var(--spacing-md);
		margin-top: var(--spacing-xs);
		z-index: 50;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		min-width: 1200px;
		max-width: 95vw;
	}

	.field-selector-panels {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--spacing-xl);
		margin-bottom: var(--spacing-md);
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