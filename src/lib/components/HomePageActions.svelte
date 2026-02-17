<script lang="ts">
	import ActionDock from './ActionDock.svelte';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import type { EntityType } from '$lib/modals/types';

	function openModal(entityType: string) {
		modalStore.open(createModalConfig(entityType as EntityType, 'create'));
	}

	function toggleTheme() {
		console.log('Toggle theme');
		// TODO: Implement theme toggle
	}

	function showHelp() {
		console.log('Show help');
		// TODO: Implement help modal
	}

	const buttons = [
		{
			id: 'create',
			label: 'Create',
			variant: 'create' as const,
			items: [
				{ label: 'Incident', action: () => openModal('incident') }
			]
		},
		{
			id: 'other',
			label: 'Other',
			variant: 'other' as const,
			items: [
				{ label: 'Toggle Theme', action: toggleTheme },
				{ label: 'Help', action: showHelp }
			]
		}
	];
</script>

<ActionDock {buttons} />