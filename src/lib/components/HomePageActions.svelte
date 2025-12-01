<script lang="ts">
	import ActionDock from './ActionDock.svelte';
	import { modalStore } from '$lib/stores/modalStore';

	function openModal(entityType: string) {
		modalStore.open({
			title: entityType.replace(/_/g, ' '),
			entityType: entityType as any,
			mode: 'create',
			onSubmit: async (data) => {
				console.log('Creating:', data);
				// Determine API endpoint
				const endpoint = `/api/create/core/${entityType}`;
				
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data)
				});
				
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to save');
				}
			}
		});
	}

	function handleImport() {
		console.log('Import data');
		// TODO: Implement import functionality
	}

	function handleExport() {
		console.log('Export data');
		// TODO: Implement export functionality
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
				{ label: 'Import Data', action: handleImport },
				{ label: 'Export Data', action: handleExport },
				{ label: 'Toggle Theme', action: toggleTheme },
				{ label: 'Help', action: showHelp }
			]
		}
	];
</script>

<ActionDock {buttons} />