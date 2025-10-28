<script lang="ts">
	import "../app.css";
	import { onMount, onDestroy } from 'svelte';
	import { 
		initializeAllCaches,
		setupIncidentWatcher,
		currentSelectedAnalyst, 
		analysts,
		currentSelectedIncident,
		currentCachedIncidents
	} from '$lib/stores/cacheStore';
	import { modalStore } from '$lib/stores/modalStore';
	import { goto } from '$app/navigation';
	import FloatingQuickActions from '$lib/components/FloatingQuickActions.svelte';
	import GenericModal from '$lib/components/GenericModal.svelte';
	
	let { children } = $props();
	let showCreateDropdown = $state(false);
	let showRelateDropdown = $state(false);
	let showDatabaseDropdown = $state(false);
	let unsubscribe: (() => void) | undefined;
	
	onMount(async () => {
		// Initialize all caches first
		await initializeAllCaches();
		
		// Then set up the reactive incident watcher
		unsubscribe = setupIncidentWatcher();

		if ($currentSelectedAnalyst === null) {
			const allAnalysts = $analysts;
			if (allAnalysts.length > 0) {
				// Set the first analyst as the current selected analyst
				currentSelectedAnalyst.set(allAnalysts[0]);
			}
		}

		if ($currentSelectedIncident === null) {
			const allIncidents = $currentCachedIncidents;
			if (allIncidents.length > 0) {
				// Set the first incident as the current selected incident
				currentSelectedIncident.set(allIncidents[0]);
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
				
				// Refresh caches
				await initializeAllCaches();
			}
		});
		
		// Close dropdowns
		showCreateDropdown = false;
		showDatabaseDropdown = false;
	}
	
	function toggleCreateDropdown() {
		showCreateDropdown = !showCreateDropdown;
	}
	
	function toggleRelateDropdown() {
		showRelateDropdown = !showRelateDropdown;
	}
	
	function toggleDatabaseDropdown() {
		showDatabaseDropdown = !showDatabaseDropdown;
	}
	
	function handleImport() {}
	function handleExport() {}
	function toggleTheme() {}
	function showHelp() {}
	function toggleTerminal() {}
	
	// TODO: Implement relation modals (these need custom handling)
	function openRelationModal(relationType: string) {
		console.log('Opening relation modal:', relationType);
		// These will need custom modal implementations since they're more complex
		showRelateDropdown = false;
	}

</script>

<!-- Generic Modal -->
<GenericModal />

<!-- Floating Quick Actions Menu -->
<FloatingQuickActions />

{@render children?.()}

<!-- Terminal-style Action Dock -->
<div class="fixed bottom-0 left-0 w-full bg-slate-950/95 backdrop-blur-md border-t border-green-500/40 flex justify-between items-center px-3 py-1 z-[100] shadow-lg shadow-green-500/20 font-mono">
	
	<!-- Left Group: Navigation Shortcuts -->
	<div class="flex gap-1.5 items-center">
		<button 
			class="w-8 h-8 flex items-center justify-center bg-slate-900 border border-cyan-500/40 rounded hover:border-cyan-500 hover:bg-cyan-500/10 hover:scale-110 transition-all duration-200 text-base hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95" 
			onclick={() => goto("/")}
			title="Home">
			🏠
		</button>
		<button 
			class="w-8 h-8 flex items-center justify-center bg-slate-900 border border-cyan-500/40 rounded hover:border-cyan-500 hover:bg-cyan-500/10 hover:scale-110 transition-all duration-200 text-base hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95" 
			onclick={toggleTerminal}
			title="Terminal">
			🖲️
		</button>
	</div>

	<!-- Center Group: Main Actions -->
	<div class="flex gap-2 items-center">
		<!-- Create Entities Dropdown -->
		<div class="relative">
			<button 
				class="px-3 py-1 bg-green-900/30 border border-green-500/50 rounded text-green-400 font-semibold text-xs uppercase tracking-wide hover:bg-green-900/50 hover:border-green-500 hover:text-green-300 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/30 active:scale-95 flex items-center gap-1.5" 
				onclick={toggleCreateDropdown}>
				<span class="text-sm">➕</span>
				Create Entities
			</button>
			{#if showCreateDropdown}
				<div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-[100] min-w-[180px] bg-slate-900/95 backdrop-blur-md border border-green-500/50 rounded overflow-hidden shadow-2xl shadow-green-500/40">
					<button 
						class="block w-full px-3 py-1.5 text-left text-green-300 text-xs hover:bg-green-500/20 hover:text-green-200 transition-colors duration-150 border-b border-green-500/20 hover:border-green-500/40" 
						onclick={() => openModal("timeline_event")}>
						<span class="text-green-500 mr-1.5">▸</span>Timeline Event
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-green-300 text-xs hover:bg-green-500/20 hover:text-green-200 transition-colors duration-150 border-b border-green-500/20 hover:border-green-500/40" 
						onclick={() => openModal("entity")}>
						<span class="text-green-500 mr-1.5">▸</span>Entity
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-green-300 text-xs hover:bg-green-500/20 hover:text-green-200 transition-colors duration-150 border-b border-green-500/20 hover:border-green-500/40" 
						onclick={() => openModal("investigation_action")}>
						<span class="text-green-500 mr-1.5">▸</span>Investigation Action
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-green-300 text-xs hover:bg-green-500/20 hover:text-green-200 transition-colors duration-150 border-b border-green-500/20 hover:border-green-500/40" 
						onclick={() => openModal("incident")}>
						<span class="text-green-500 mr-1.5">▸</span>Incident
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-green-300 text-xs hover:bg-green-500/20 hover:text-green-200 transition-colors duration-150" 
						onclick={() => openModal("annotation")}>
						<span class="text-green-500 mr-1.5">▸</span>Annotation
					</button>
				</div>
			{/if}
		</div>

		<!-- Relate Entities Dropdown -->
		<div class="relative">
			<button 
				class="px-3 py-1 bg-purple-900/30 border border-purple-500/50 rounded text-purple-400 font-semibold text-xs uppercase tracking-wide hover:bg-purple-900/50 hover:border-purple-500 hover:text-purple-300 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/30 active:scale-95 flex items-center gap-1.5" 
				onclick={toggleRelateDropdown}>
				<span class="text-sm">🔗</span>
				Relate Entities
			</button>
			{#if showRelateDropdown}
				<div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-[100] min-w-[200px] bg-slate-900/95 backdrop-blur-md border border-purple-500/50 rounded overflow-hidden shadow-2xl shadow-purple-500/40">
					<button 
						class="block w-full px-3 py-1.5 text-left text-purple-300 text-xs hover:bg-purple-500/20 hover:text-purple-200 transition-colors duration-150 border-b border-purple-500/20 hover:border-purple-500/40" 
						onclick={() => openRelationModal("ActionEventsRelation")}>
						<span class="text-purple-500 mr-1.5">▸</span>Relate Action to Events
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-purple-300 text-xs hover:bg-purple-500/20 hover:text-purple-200 transition-colors duration-150 border-b border-purple-500/20 hover:border-purple-500/40" 
						onclick={() => openRelationModal("ActionEntitiesRelation")}>
						<span class="text-purple-500 mr-1.5">▸</span>Relate Action to Entities
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-purple-300 text-xs hover:bg-purple-500/20 hover:text-purple-200 transition-colors duration-150" 
						onclick={() => openRelationModal("EventEntitiesRelation")}>
						<span class="text-purple-500 mr-1.5">▸</span>Relate Event to Entities
					</button>
				</div>
			{/if}
		</div>

		<!-- Configure Database Dropdown -->
		<div class="relative">
			<button 
				class="px-3 py-1 bg-amber-900/30 border border-amber-500/50 rounded text-amber-400 font-semibold text-xs uppercase tracking-wide hover:bg-amber-900/50 hover:border-amber-500 hover:text-amber-300 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/30 active:scale-95 flex items-center gap-1.5" 
				onclick={toggleDatabaseDropdown}>
				<span class="text-sm">⚙️</span>
				Configure Database
			</button>
			{#if showDatabaseDropdown}
				<div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-[100] min-w-[180px] bg-slate-900/95 backdrop-blur-md border border-amber-500/50 rounded overflow-hidden shadow-2xl shadow-amber-500/40">
					<button 
						class="block w-full px-3 py-1.5 text-left text-amber-300 text-xs hover:bg-amber-500/20 hover:text-amber-200 transition-colors duration-150 border-b border-amber-500/20 hover:border-amber-500/40" 
						onclick={() => openModal("action_type")}>
						<span class="text-amber-500 mr-1.5">▸</span>Add Action Type
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-amber-300 text-xs hover:bg-amber-500/20 hover:text-amber-200 transition-colors duration-150 border-b border-amber-500/20 hover:border-amber-500/40" 
						onclick={() => openModal("entity_type")}>
						<span class="text-amber-500 mr-1.5">▸</span>Add Entity Type
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-amber-300 text-xs hover:bg-amber-500/20 hover:text-amber-200 transition-colors duration-150 border-b border-amber-500/20 hover:border-amber-500/40" 
						onclick={() => openModal("event_type")}>
						<span class="text-amber-500 mr-1.5">▸</span>Add Event Type
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-amber-300 text-xs hover:bg-amber-500/20 hover:text-amber-200 transition-colors duration-150 border-b border-amber-500/20 hover:border-amber-500/40" 
						onclick={() => openModal("annotation_type")}>
						<span class="text-amber-500 mr-1.5">▸</span>Add Annotation Type
					</button>
					<button 
						class="block w-full px-3 py-1.5 text-left text-amber-300 text-xs hover:bg-amber-500/20 hover:text-amber-200 transition-colors duration-150" 
						onclick={() => openModal("analyst")}>
						<span class="text-amber-500 mr-1.5">▸</span>Add Analyst
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Right Group: Utility Buttons -->
	<div class="flex gap-1.5 items-center">
		<button 
			class="w-8 h-8 flex items-center justify-center bg-slate-900 border border-cyan-500/40 rounded hover:border-cyan-500 hover:bg-cyan-500/10 hover:scale-110 transition-all duration-200 text-base hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95" 
			onclick={handleImport} 
			title="Import data">
			⬇️
		</button>
		<button 
			class="w-8 h-8 flex items-center justify-center bg-slate-900 border border-cyan-500/40 rounded hover:border-cyan-500 hover:bg-cyan-500/10 hover:scale-110 transition-all duration-200 text-base hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95" 
			onclick={handleExport} 
			title="Export data">
			⬆️
		</button>
		<button 
			class="w-8 h-8 flex items-center justify-center bg-slate-900 border border-cyan-500/40 rounded hover:border-cyan-500 hover:bg-cyan-500/10 hover:scale-110 transition-all duration-200 text-base hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95" 
			onclick={toggleTheme} 
			title="Toggle theme">
			🎞️
		</button>
		<button 
			class="w-8 h-8 flex items-center justify-center bg-slate-900 border border-cyan-500/40 rounded hover:border-cyan-500 hover:bg-cyan-500/10 hover:scale-110 transition-all duration-200 text-base hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95" 
			onclick={showHelp} 
			title="Show help">
			🤔
		</button>
	</div>
</div>
