<script lang="ts">
	// Core stuff
	import "../app.css";
	import { onMount, onDestroy, setContext } from 'svelte';
	
	// Stores
	import { 
		initializeAllCaches,
		analysts,
		setupIncidentWatcher,
		currentSelectedAnalyst,
		currentSelectedIncident,
	} from '$lib/stores/cacheStore';
	import { modalStore } from '$lib/stores/modalStore';
	import GenericModal from '$lib/components/GenericModal.svelte';
	
	// Local Props and State
	let { children } = $props();
	let showCreateDropdown = $state(false);
	let showRelateDropdown = $state(false);
	let showDatabaseDropdown = $state(false);
	let showOtherDropdown = $state(false);
	let unsubscribe: (() => void) | undefined;

	// Dynamic HUD Info 
	let dynamicComponents = $state<Record<string, any>>({});
	type supportedSections = 'stats' | 'actions' | 'userActivity';

	setContext('dynamicLayoutSlots', {
		register: (section: supportedSections, component: any) => {
			dynamicComponents[section] = component;
		},
		unregister: (section: supportedSections) => {
			dynamicComponents[section] = null;
		},
	});


	
	onMount(async () => {
		// Initialize all caches first
		await initializeAllCaches();
		
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
	});
	
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
	
</script>

<!-- Generic Modal -->
<GenericModal />

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
	
	<!-- Active Users Indicator - section -->

	<!-- Current page Statistics - section -->
	 {#if dynamicComponents.stats}
		<div class="stats-info">
			{@render dynamicComponents.stats?.() }
		</div>
	{/if}
</div>


<!-- Action Dock - section -->
<div class="action-dock">
	 {#if dynamicComponents.actions}
		{@render dynamicComponents.actions?.() }
	{/if}
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
</style>