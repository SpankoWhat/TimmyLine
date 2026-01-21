<script lang="ts">
	import ActionDock from './ActionDock.svelte';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import type { EntityType, ModalMode } from '$lib/modals/types';

	// Simplified modal opening function
	function openModal(entityType: string, mode: ModalMode = 'create') {
		modalStore.open(createModalConfig(entityType as EntityType, mode));
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
				{ label: 'Action → Events', action: () => openModal('action_events') },
				{ label: 'Action → Entities', action: () => openModal('action_entities') },
				{ label: 'Event → Entities', action: () => openModal('event_entities') }
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
			]
		}
	];
</script>

<ActionDock {buttons} />