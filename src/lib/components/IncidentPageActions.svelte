<script lang="ts">
	import ActionDock from './ActionDock.svelte';
	import { modalStore } from '$lib/stores/modalStore';
	// Stores
	import { 
		currentSelectedAnalyst,
		currentSelectedIncident,
	} from '$lib/stores/cacheStore';

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
					data.table = entityType;
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
	}

	function openRelationModal(relationType: string) {
		console.log('Opening relation modal:', relationType);
		// TODO: Implement relation modal logic
	}

	const buttons = [
		{
			id: 'create',
			label: 'Create',
			variant: 'create' as const,
			items: [
				{ label: 'Timeline Event', action: () => openModal('timeline_event') },
				{ label: 'Entity', action: () => openModal('entity') },
				{ label: 'Investigation Action', action: () => openModal('investigation_action') },
				{ label: 'Annotation', action: () => openModal('annotation') }
			]
		},
		{
			id: 'relate',
			label: 'Relate',
			variant: 'relate' as const,
			items: [
				{ label: 'Action → Events', action: () => openRelationModal('ActionEventsRelation') },
				{ label: 'Action → Entities', action: () => openRelationModal('ActionEntitiesRelation') },
				{ label: 'Event → Entities', action: () => openRelationModal('EventEntitiesRelation') }
			]
		},
		{
			id: 'config',
			label: 'Configure',
			variant: 'config' as const,
			items: [
				{ label: 'Action Type', action: () => openModal('action_type') },
				{ label: 'Entity Type', action: () => openModal('entity_type') },
				{ label: 'Event Type', action: () => openModal('event_type') },
				{ label: 'Annotation Type', action: () => openModal('annotation_type') },
				{ label: 'Analyst', action: () => openModal('analyst') }
			]
		}
	];
</script>

<ActionDock {buttons} />