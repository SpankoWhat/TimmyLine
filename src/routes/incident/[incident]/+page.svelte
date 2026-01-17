<script lang="ts">
	// Svelte Imports
	import { onMount, onDestroy, getContext} from 'svelte';
	import type { PageProps } from './$types';
	
	// Store Imports
	import { currentSelectedIncident, combinedTimeline, currentSelectedAnalyst, initializeAllCaches, showDeletedItems, clearHighlights} from "$lib/stores/cacheStore.js";
	import { joinIncidentSocket, leaveIncidentSocket } from "$lib/stores/collabStore.js";
    import type { Incident } from '$lib/server/database';
	
	// Prop Imports
	import TimeLineRow from "$lib/components/TimelineRow.svelte";
	import IncidentStats from '$lib/components/IncidentStats.svelte';
	import IncidentPageActions from '$lib/components/IncidentPageActions.svelte';
	import ActiveUsersIndicator from '$lib/components/ActiveUsersIndicator.svelte';
	import EntitiesAnnotationsPanel from '$lib/components/EntitiesAnnotationsPanel.svelte';
	import { displayFieldsConfig } from '$lib/config/displayFieldsConfig';
	
    let { data }: PageProps = $props();
	let { register, unregister } : any = getContext('dynamicLayoutSlots');

	// Track selected fields and their pinned state for each type (event/action) independently
	let fieldStates = $state({
		event: displayFieldsConfig.event.map(f => ({ ...f })),
		action: displayFieldsConfig.action.map(f => ({ ...f }))
	});

	let showFieldSelector = $state(false);
	let showEntitiesPanel = $state(false);

	// Drag and drop state
	let draggedField: { type: 'event' | 'action'; key: string } | null = $state(null);
	let dragOverField: { type: 'event' | 'action'; key: string } | null = $state(null);

	// Compute filtered field configs based on selected fields, sorted by order
	const filteredDisplayFieldsConfig = $derived({
		event: [...fieldStates.event].sort((a, b) => a.order - b.order),
		action: [...fieldStates.action].sort((a, b) => a.order - b.order)
	});

	// Get pinned fields sorted by order for display in dropdown
	const sortedPinnedFields = $derived({
		event: fieldStates.event
			.filter(f => f.pinned && !f.hideFromUser)
			.sort((a, b) => a.order - b.order),
		action: fieldStates.action
			.filter(f => f.pinned && !f.hideFromUser)
			.sort((a, b) => a.order - b.order)
	});

	// Get unpinned fields for display in dropdown
	const unpinnedFields = $derived({
		event: fieldStates.event.filter(f => !f.pinned && !f.hideFromUser),
		action: fieldStates.action.filter(f => !f.pinned && !f.hideFromUser)
	});

	function toggleFieldPinned(type: 'event' | 'action', fieldKey: string) {
		const field = fieldStates[type].find(f => f.key === fieldKey);
		if (field) {
			if (field.pinned) {
				// Unpinning: set order to high value
				const maxOrder = Math.max(...fieldStates[type].map(f => f.order));
				field.order = maxOrder + 1;
				field.pinned = false;
			} else {
				// Pinning: append to end of pinned fields
				const pinnedFields = fieldStates[type].filter(f => f.pinned);
				const maxPinnedOrder = pinnedFields.length > 0 
					? Math.max(...pinnedFields.map(f => f.order)) 
					: 0;
				field.order = maxPinnedOrder + 1;
				field.pinned = true;
			}
		}
	}

	function resetFieldSelection() {
		fieldStates = {
			event: displayFieldsConfig.event.map(f => ({ ...f })),
			action: displayFieldsConfig.action.map(f => ({ ...f }))
		};
	}

	// Drag and drop handlers
	function handleDragStart(type: 'event' | 'action', fieldKey: string) {
		draggedField = { type, key: fieldKey };
	}

	function handleDragOver(e: DragEvent, type: 'event' | 'action', fieldKey: string) {
		e.preventDefault();
		if (draggedField && draggedField.type === type && draggedField.key !== fieldKey) {
			dragOverField = { type, key: fieldKey };
		}
	}

	function handleDragLeave() {
		dragOverField = null;
	}

	function handleDrop(type: 'event' | 'action', targetFieldKey: string) {
		if (!draggedField || draggedField.type !== type) {
			draggedField = null;
			dragOverField = null;
			return;
		}

		const draggedFieldObj = fieldStates[type].find(f => f.key === draggedField!.key);
		const targetFieldObj = fieldStates[type].find(f => f.key === targetFieldKey);

		if (draggedFieldObj && targetFieldObj && draggedFieldObj.pinned && targetFieldObj.pinned) {
			// Swap orders between dragged and target
			const pinnedFields = fieldStates[type]
				.filter(f => f.pinned && !f.hideFromUser)
				.sort((a, b) => a.order - b.order);
			
			const draggedIndex = pinnedFields.findIndex(f => f.key === draggedField!.key);
			const targetIndex = pinnedFields.findIndex(f => f.key === targetFieldKey);

			if (draggedIndex !== -1 && targetIndex !== -1) {
				// Reorder: move dragged to target position
				const [removed] = pinnedFields.splice(draggedIndex, 1);
				pinnedFields.splice(targetIndex, 0, removed);

				// Reassign orders based on new positions
				pinnedFields.forEach((field, index) => {
					const stateField = fieldStates[type].find(f => f.key === field.key);
					if (stateField) {
						stateField.order = index + 1;
					}
				});
			}
		}

		draggedField = null;
		dragOverField = null;
	}

	function handleDragEnd() {
		draggedField = null;
		dragOverField = null;
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
							<!-- Events Fields -->
							<div class="field-section">
								<div class="field-section-title">Event Fields</div>
								
								<!-- Pinned fields (draggable) -->
								{#if sortedPinnedFields.event.length > 0}
									<div class="field-subsection-title">Pinned (drag to reorder)</div>
									<div class="field-list pinned-list">
										{#each sortedPinnedFields.event as field (field.key)}
											<div 
												class="field-row draggable"
												class:drag-over={dragOverField?.type === 'event' && dragOverField?.key === field.key}
												draggable="true"
												ondragstart={() => handleDragStart('event', field.key)}
												ondragover={(e) => handleDragOver(e, 'event', field.key)}
												ondragleave={handleDragLeave}
												ondrop={() => handleDrop('event', field.key)}
												ondragend={handleDragEnd}
											>
												<span class="drag-handle">⋮⋮</span>
												<label class="field-checkbox-label">
													<input 
														type="checkbox" 
														checked={field.pinned}
														onchange={() => toggleFieldPinned('event', field.key)}
													/>
													<span>{field.label}</span>
												</label>
											</div>
										{/each}
									</div>
								{/if}
								
								<!-- Unpinned fields -->
								{#if unpinnedFields.event.length > 0}
									<div class="field-subsection-title">Available</div>
									<div class="field-list">
										{#each unpinnedFields.event as field (field.key)}
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
										{/each}
									</div>
								{/if}
							</div>

							<!-- Actions Fields -->
							<div class="field-section">
								<div class="field-section-title">Action Fields</div>
								
								<!-- Pinned fields (draggable) -->
								{#if sortedPinnedFields.action.length > 0}
									<div class="field-subsection-title">Pinned (drag to reorder)</div>
									<div class="field-list pinned-list">
										{#each sortedPinnedFields.action as field (field.key)}
											<div 
												class="field-row draggable"
												class:drag-over={dragOverField?.type === 'action' && dragOverField?.key === field.key}
												draggable="true"
												ondragstart={() => handleDragStart('action', field.key)}
												ondragover={(e) => handleDragOver(e, 'action', field.key)}
												ondragleave={handleDragLeave}
												ondrop={() => handleDrop('action', field.key)}
												ondragend={handleDragEnd}
											>
												<span class="drag-handle">⋮⋮</span>
												<label class="field-checkbox-label">
													<input 
														type="checkbox" 
														checked={field.pinned}
														onchange={() => toggleFieldPinned('action', field.key)}
													/>
													<span>{field.label}</span>
												</label>
											</div>
										{/each}
									</div>
								{/if}
								
								<!-- Unpinned fields -->
								{#if unpinnedFields.action.length > 0}
									<div class="field-subsection-title">Available</div>
									<div class="field-list">
										{#each unpinnedFields.action as field (field.key)}
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
										{/each}
									</div>
								{/if}
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
		padding: var(--spacing-sm);
		margin-top: var(--spacing-xs);
		z-index: 50;
		/* min-width: 250px; */
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

	.field-list.pinned-list {
		background: var(--color-bg-tertiary);
		border-radius: var(--border-radius-sm);
		padding: var(--spacing-xs);
	}

	.field-subsection-title {
		font-size: 9px;
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: var(--spacing-xs);
		margin-bottom: calc(var(--spacing-xs) / 2);
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		justify-content: flex-start;
	}

	.field-row.draggable {
		cursor: grab;
		border: 1px solid transparent;
		border-radius: var(--border-radius-sm);
		padding: 2px;
		margin: -2px;
		transition: all 0.15s ease;
	}

	.field-row.draggable:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-border-medium);
	}

	.field-row.draggable:active {
		cursor: grabbing;
	}

	.field-row.drag-over {
		border-color: var(--color-accent-primary);
		background: rgba(0, 255, 0, 0.1);
	}

	.drag-handle {
		color: var(--color-text-tertiary);
		font-size: 10px;
		user-select: none;
		cursor: grab;
		padding: 0 2px;
	}

	.field-row.draggable:hover .drag-handle {
		color: var(--color-accent-primary);
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