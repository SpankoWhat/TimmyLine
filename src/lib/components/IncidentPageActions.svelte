<script lang="ts">
	import ActionDock from './ActionDock.svelte';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import type { EntityType, ModalMode } from '$lib/modals/types';
	import { currentSelectedIncident } from '$lib/stores/cacheStore';

	// Simplified modal opening function
	function openModal(entityType: string, mode: ModalMode = 'create') {
		modalStore.open(createModalConfig(entityType as EntityType, mode));
	}

	let isExporting = $state(false);

	async function handleInteractiveExport() {
		const incident = $currentSelectedIncident;
		if (!incident?.uuid) {
			alert('No incident selected for export.');
			return;
		}

		isExporting = true;
		try {
			const response = await fetch(`/api/read/core/export?incident_id=${incident.uuid}`);
			if (!response.ok) {
				const err = await response.json().catch(() => ({ error: 'Export failed' }));
				throw new Error(err.error || `Export failed (${response.status})`);
			}

			// Extract filename from Content-Disposition header or use default
			const disposition = response.headers.get('Content-Disposition');
			let filename = `TimmyLine_${incident.title.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_')}.html`;
			if (disposition) {
				const match = disposition.match(/filename="?([^"]+)"?/);
				if (match) filename = match[1];
			}

			// Trigger browser download
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Interactive export failed:', err);
			alert(`Export failed: ${(err as Error).message}`);
		} finally {
			isExporting = false;
		}
	}

	function handleJsonExport() {
		console.log('JSON Export');
	}

	const buttons = $derived([
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
		},
		{
			id: 'export',
			label: 'Export',
			variant: 'export' as const,
			items: [
				{ label: isExporting ? 'Exporting...' : 'Interactive Export', action: handleInteractiveExport },
				{ label: 'JSON Export', action: handleJsonExport }
			]
		}
	]);
</script>

<ActionDock {buttons} />