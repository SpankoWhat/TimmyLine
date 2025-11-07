<script lang="ts">
	// Core stuff
	import "../app.css";
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from "$app/state";
	
	// Stores
	import { 
		initializeAllCaches,
		initializeCacheSync,
		analysts,
		incidentStats,
		combinedTimeline,
		setupIncidentWatcher,
		currentSelectedAnalyst,
		currentSelectedIncident,
		currentCachedTimelineEvents,
		currentCachedInvestigationActions,
	} from '$lib/stores/cacheStore';
	import { initializePresence, cleanupPresence } from '$lib/stores/presenceStore';
	import { modalStore } from '$lib/stores/modalStore';
	import GenericModal from '$lib/components/GenericModal.svelte';
	import ActiveUsersIndicator from '$lib/components/ActiveUsersIndicator.svelte';
	
	// Local Props and State
	let { children } = $props();
	let showCreateDropdown = $state(false);
	let showRelateDropdown = $state(false);
	let showDatabaseDropdown = $state(false);
	let showOtherDropdown = $state(false);
	let unsubscribe: (() => void) | undefined;
	
	onMount(async () => {
		// Initialize all caches first
		await initializeAllCaches();
		
		// Initialize socket connection and real-time sync
		initializeCacheSync();
		
		// Initialize presence tracking
		initializePresence();
		
		// Then set up the reactive incident watcher
		unsubscribe = setupIncidentWatcher();

		// Env setup: select default analyst and incident if none selected
		if ($currentSelectedAnalyst === null) {
			const allAnalysts = $analysts;
			if (allAnalysts.length > 0) {
				// Set the first analyst as the current selected analyst
				currentSelectedAnalyst.set(allAnalysts[0]);
			}
		}

	});
	
	onDestroy(() => {
		// Clean up subscription when layout unmounts
		unsubscribe?.();
		cleanupPresence();
	});

	let isIncidentPage = $derived(page.url.pathname.startsWith('/incident/'));
	
	// Simplified modal opening function
	async function openModal(entityType: string, mode: 'create' | 'edit' = 'create') {
		modalStore.open({
			title: entityType.replace(/_/g, ' '),
			entityType: entityType as any,
			mode,
			onSubmit: async (data) => {
				// Add current incident UUID for core entities
				if (['timeline_event', 'investigation_action', 'annotation', 'entity'].includes(entityType)) {
					data.incident_id = $currentSelectedIncident?.uuid;
				}
				
				console.log('Submitting data:', data);
				// Add specific fields based on entity type
				switch (entityType) {
					case 'timeline_event':
						data.discovered_by = $currentSelectedAnalyst?.uuid;
						break;
					case 'investigation_action':
						data.actioned_by = $currentSelectedAnalyst?.uuid;
						break;
					case 'annotation':
						data.noted_by = $currentSelectedAnalyst?.uuid;
						break;
					case 'entity':
						data.entered_by = $currentSelectedAnalyst?.uuid;
						break;
				}
				
				// Convert datetime fields to epoch if needed
				if (data.occurred_at && typeof data.occurred_at === 'string') {
					data.occurred_at = new Date(data.occurred_at).getTime();
				}
				if (data.discovered_at && typeof data.discovered_at === 'string') {
					data.discovered_at = new Date(data.discovered_at).getTime();
				}
				if (data.performed_at && typeof data.performed_at === 'string') {
					data.performed_at = new Date(data.performed_at).getTime();
				}
				if (data.created_at && typeof data.created_at === 'string') {
					data.created_at = new Date(data.created_at).getTime();
				}
				
				// Determine API endpoint based on entity type
				let endpoint = '';
				if (['action_type', 'entity_type', 'event_type', 'annotation_type'].includes(entityType)) {
					endpoint = `/api/create/lookup`;
				} else {
					endpoint = `/api/create/core/${entityType}`;
				}
				
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				});
				
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to save');
				}
				
				// Refresh caches - removed to opt in for the event listener socket approach
				// await initializeAllCaches();
			}
		});
		
		// Close dropdowns
		showCreateDropdown = false;
		showRelateDropdown = false;
		showDatabaseDropdown = false;
		showOtherDropdown = false;
	}
	
	function toggleCreateDropdown() {
		showCreateDropdown = !showCreateDropdown;
		showRelateDropdown = false;
		showDatabaseDropdown = false;
		showOtherDropdown = false;
	}
	
	function toggleRelateDropdown() {
		showRelateDropdown = !showRelateDropdown;
		showCreateDropdown = false;
		showDatabaseDropdown = false;
		showOtherDropdown = false;
	}
	
	function toggleDatabaseDropdown() {
		showDatabaseDropdown = !showDatabaseDropdown;
		showCreateDropdown = false;
		showRelateDropdown = false;
		showOtherDropdown = false;
	}

	function toggleOtherDropdown() {
		showOtherDropdown = !showOtherDropdown;
		showCreateDropdown = false;
		showRelateDropdown = false;
		showDatabaseDropdown = false;
	}
	
	function handleImport() {}
	function handleExport() {}
	function toggleTheme() {}
	function showHelp() {}
	
	// TODO: Implement relation modals (these need custom handling)
	function openRelationModal(relationType: string) {
		console.log('Opening relation modal:', relationType);
		// These will need custom modal implementations since they're more complex
		showRelateDropdown = false;
	}

</script>

<!-- Generic Modal -->
<GenericModal />

<!-- DECOMISSIONED - Floating Quick Actions Menu -->
<!-- <FloatingQuickActions /> -->

{@render children?.()}

<div class="header">
	<div class="header-info">
		<span class="header-label">Analyst:</span>
		<span class="header-value">{$currentSelectedAnalyst?.full_name || 'Not Selected'}</span>
	</div>
	<div class="header-info">
		<span class="header-label">Incident:</span>
		<span class="header-value">{$currentSelectedIncident?.title || 'Not Selected'}</span>
	</div>
	
	<!-- Active Users Indicator -->
	{#if isIncidentPage}
		<ActiveUsersIndicator />
	{/if}

	{#if !isIncidentPage}
		<!-- Landing Page Statistics -->
		<div class="stats-info">
			<div class="stat-card info">
				<div class="stat-label">Total</div>
				<div class="stat-value">{$incidentStats.total || 0}</div>
			</div>
			<div class="divider"> | </div>
			<div class="stat-card critical">
				<div class="stat-label">Critical</div>
				<div class="stat-value">{$incidentStats.critical || 0}</div>
			</div>
			<div class="stat-card warning">
				<div class="stat-label">High</div>
				<div class="stat-value">{$incidentStats.high || 0}</div>
			</div>
			<div class="divider"> | </div>
			<div class="stat-card info">
				<div class="stat-label">In Progress</div>
				<div class="stat-value">{$incidentStats.inProgress || 0}</div>
			</div>
			<div class="stat-card success">
				<div class="stat-label">Closed</div>
				<div class="stat-value">{$incidentStats.closed || 0}</div>
			</div>
		</div>
	{:else}
		<!-- Show if page is incident -->
		<div class="stats-info">
			<div class="stat-card success">
				<span class="stat-label">Total</span>
				<span class="stat-value">{$combinedTimeline.length || 0}</span>
			</div>
			<div class="divider"> | </div>
			<div class="stat-card info">
				<span class="stat-label">Events</span>
				<span class="stat-value">{$currentCachedTimelineEvents.length || 0}</span>
			</div>
			<div class="stat-card info">
				<span class="stat-label">Actions</span>
				<span class="stat-value">{$currentCachedInvestigationActions.length || 0}</span>
			</div>
		</div>
	{/if}
</div>


<!-- Action Dock -->
<div class="action-dock">
	<!-- Left: Navigation -->
	<div class="dock-section">
		<button class="action-btn home" onclick={() => goto("/")} title="Home">Home</button>
		<!-- <button class="icon-btn" onclick={toggleTerminal} title="Terminal">🖲️</button> -->
	</div>

	<!-- Center: Main Actions -->
	<div class="dock-section">
		<!-- Create Entities -->
		<div class="dropdown-wrapper">
			<button class="action-btn create" onclick={toggleCreateDropdown}>Create</button>
			{#if showCreateDropdown}
				<div class="dropdown-menu">
					<button class="dropdown-item" onclick={() => openModal("timeline_event")}>Timeline Event</button>
					<button class="dropdown-item" onclick={() => openModal("entity")}>Entity</button>
					<button class="dropdown-item" onclick={() => openModal("investigation_action")}>Investigation Action</button>
					<button class="dropdown-item" onclick={() => openModal("incident")}>Incident</button>
					<button class="dropdown-item" onclick={() => openModal("annotation")}>Annotation</button>
				</div>
			{/if}
		</div>

		<!-- Relate Entities -->
		<div class="dropdown-wrapper">
			<button class="action-btn relate" onclick={toggleRelateDropdown}>Relate</button>
			{#if showRelateDropdown}
				<div class="dropdown-menu">
					<button class="dropdown-item" onclick={() => openRelationModal("ActionEventsRelation")}>Action → Events</button>
					<button class="dropdown-item" onclick={() => openRelationModal("ActionEntitiesRelation")}>Action → Entities</button>
					<button class="dropdown-item" onclick={() => openRelationModal("EventEntitiesRelation")}>Event → Entities</button>
				</div>
			{/if}
		</div>

		<!-- Configure Database -->
		<div class="dropdown-wrapper">
			<button class="action-btn config" onclick={toggleDatabaseDropdown}>Configure</button>
			{#if showDatabaseDropdown}
				<div class="dropdown-menu">
					<button class="dropdown-item" onclick={() => openModal("action_type")}>Action Type</button>
					<button class="dropdown-item" onclick={() => openModal("entity_type")}>Entity Type</button>
					<button class="dropdown-item" onclick={() => openModal("event_type")}>Event Type</button>
					<button class="dropdown-item" onclick={() => openModal("annotation_type")}>Annotation Type</button>
					<button class="dropdown-item" onclick={() => openModal("analyst")}>Analyst</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Right: Utilities -->
	<div class="dock-section">
		<button class="action-btn other" onclick={toggleOtherDropdown} title="Import">Other</button>
		{#if showOtherDropdown}
			<div class="dropdown-menu other-menu">
				<button class="dropdown-item" onclick={handleImport}>Import Data</button>
				<button class="dropdown-item" onclick={handleExport}>Export Data</button>
				<button class="dropdown-item" onclick={toggleTheme}>Toggle Theme</button>
				<button class="dropdown-item" onclick={showHelp}>Help</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.action-dock {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 2rem;
		background: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border-medium);
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-xs) var(--spacing-md);
		z-index: 100;
	}

	.header {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		padding: var(--spacing-xs) var(--spacing-sm);
		display: flex;
		justify-content: left;
	}

	.header-info {
		display: flex;
		padding-left: var(--spacing-xs);
		padding-right: var(--spacing-xs);
		align-items: center;
		gap: var(--spacing-xs);
		font-size: var(--font-size-sm);
	}

	.header-label {
		color: var(--color-text-tertiary);
	}

	.header-value {
		color: var(--color-accent-primary);
		font-weight: var(--font-weight-medium);
	}

	.stats-info {
		display: flex;
		gap: var(--spacing-sm);
		align-self: center;
		margin-left: auto;
	}

	.stat-card {
		display: flex;
		flex-direction: row;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		padding-left: var(--spacing-md);
		padding-right: var(--spacing-md);
	}

	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		padding-left: var(--spacing-sm);
		color: var(--color-text-primary);
	}

	.stat-card.critical .stat-value { color: var(--color-accent-error); }
	.stat-card.warning .stat-value { color: var(--color-accent-warning); }
	.stat-card.success .stat-value { color: var(--color-accent-success); }
	.stat-card.info .stat-value { color: var(--color-accent-primary); }




	.dock-section {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.dropdown-wrapper {
		position: relative;
	}

	.action-btn {
		padding: var(--spacing-xs) var(--spacing-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		color: var(--color-text-primary);
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all var(--transition-fast);
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.action-btn:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-accent-primary);
	}

	.action-btn:active {
		transform: scale(0.98);
	}

	.action-btn.create {
		border-color: var(--color-accent-success);
		color: var(--color-accent-success);
	}

	.action-btn.home {
		border-color: var(--color-border-subtle);
		color: var(--color-accennt-primary);
	}

	.action-btn.create:hover {
		border-color: var(--color-accent-success);
		background: rgba(52, 211, 153, 0.1);
	}

	.action-btn.relate {
		border-color: var(--color-accent-secondary);
		color: var(--color-accent-secondary);
	}

	.action-btn.relate:hover {
		border-color: var(--color-accent-secondary);
		background: rgba(129, 140, 248, 0.1);
	}

	.action-btn.config {
		border-color: var(--color-accent-warning);
		color: var(--color-accent-warning);
	}

	.action-btn.config:hover {
		border-color: var(--color-accent-warning);
		background: rgba(251, 191, 36, 0.1);
	}

	.dropdown-menu {
		position: absolute;
		bottom: calc(100% + var(--spacing-xs));
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		min-width: 180px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		overflow: hidden;
		box-shadow: var(--shadow-md);
	}
	.dropdown-menu.other-menu {
		right: 0;
		left: auto;
		transform: none;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		text-align: left;
		color: var(--color-text-primary);
		font-size: var(--font-size-xs);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border-subtle);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.dropdown-item:last-child {
		border-bottom: none;
	}

	.dropdown-item:hover {
		background: var(--color-bg-hover);
		color: var(--color-accent-primary);
	}
</style>