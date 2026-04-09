<script lang="ts">
	import { modalStore } from '$lib/modals/ModalRegistry';
	import { updateLookupCache, updateIncidentCache, currentSelectedIncident } from '$lib/stores/cacheStore';
	import { get } from 'svelte/store';
	import type { ModalMode } from '$lib/modals/types';

	import IncidentModal from './modals/IncidentModal.svelte';
	import EventModal from './modals/EventModal.svelte';
	import ActionModal from './modals/ActionModal.svelte';
	import EntityModal from './modals/EntityModal.svelte';
	import AnnotationModal from './modals/AnnotationModal.svelte';
	import AnalystModal from './modals/AnalystModal.svelte';
	import LookupModal from './modals/LookupModal.svelte';
	import TimePreferencesModal from './modals/TimePreferencesModal.svelte';

	let current = $derived($modalStore);

	/** Narrow ModalMode to the subset our modals actually support */
	let activeMode = $derived((current?.mode ?? 'create') as 'create' | 'edit');

	function handleClose() {
		modalStore.close();
	}

	async function handleSave() {
		// Refresh caches after save
		const incident = get(currentSelectedIncident);
		if (incident) {
			await updateIncidentCache(incident);
		}
		modalStore.close();
	}

	async function handleLookupSave() {
		await updateLookupCache();
		modalStore.close();
	}

	async function handleIncidentSave() {
		await updateLookupCache(); // Incidents list is in lookup cache
		modalStore.close();
	}

	/** Check if this entity type is a lookup table */
	function isLookupType(t: string): t is 'action_type' | 'entity_type' | 'event_type' | 'annotation_type' {
		return ['action_type', 'entity_type', 'event_type', 'annotation_type'].includes(t);
	}
</script>

{#if current?.isOpen}
	{#if current.entityType === 'incident'}
		<IncidentModal
			mode={activeMode}
			data={current.data}
			onclose={handleClose}
			onsave={handleIncidentSave}
		/>
	{:else if current.entityType === 'timeline_event'}
		<EventModal
			mode={activeMode}
			data={current.data}
			onclose={handleClose}
			onsave={handleSave}
		/>
	{:else if current.entityType === 'investigation_action'}
		<ActionModal
			mode={activeMode}
			data={current.data}
			onclose={handleClose}
			onsave={handleSave}
		/>
	{:else if current.entityType === 'entity'}
		<EntityModal
			mode={activeMode}
			data={current.data}
			onclose={handleClose}
			onsave={handleSave}
		/>
	{:else if current.entityType === 'annotation'}
		<AnnotationModal
			mode={activeMode}
			data={current.data}
			onclose={handleClose}
			onsave={handleSave}
		/>
	{:else if current.entityType === 'analyst'}
		<AnalystModal
			mode={activeMode}
			data={current.data}
			onclose={handleClose}
			onsave={handleSave}
		/>
	{:else if current.entityType === 'time_preferences'}
		<TimePreferencesModal onclose={handleClose} />
	{:else if isLookupType(current.entityType)}
		<LookupModal
			mode={activeMode}
			lookupType={current.entityType}
			data={current.data}
			onclose={handleClose}
			onsave={handleLookupSave}
		/>
	{:else}
		<!-- Junction types (action_entities, action_events, event_entities) are now handled
		     inline via the RelationshipBuilder component embedded in EventModal and ActionModal.
		     Close immediately if somehow opened directly. -->
		{(() => { handleClose(); return ''; })()}
	{/if}
{/if}

<style>
</style>
