import { derived, get } from 'svelte/store';
import {
	currentCachedEntities,
	currentCachedTimeline,
	currentSelectedIncident,
	updateIncidentCache
} from './cacheStore';
import {
	buildEntityTimelineGroups,
	buildEntityReferenceIndex,
	buildTimelineItemsByUuid,
	buildTimelineRelationshipOptions,
	collectKnownJsonKeys,
	createActionTimelineItem,
	createEventTimelineItem,
	discoverTimelineDynamicFields,
	removeTimelineItem,
	upsertTimelineItem
} from '$lib/timeline/core';

const TIMELINE_SOCKET_ENTITY_TYPES = new Set([
	'timeline_event',
	'investigation_action',
	'action_entities',
	'action_events',
	'event_entities'
]);

const TIMELINE_JUNCTION_TYPES = new Set([
	'action_entities',
	'action_events',
	'event_entities'
]);

export const timelineItems = currentCachedTimeline;

export const timelineItemCount = derived(currentCachedTimeline, ($items) => $items.length);

export const investigationStats = derived(currentCachedTimeline, ($items) => ({
	total: $items.length,
	events: $items.filter((item) => item.type === 'event').length,
	actions: $items.filter((item) => item.type === 'action').length
}));

export const knownJsonKeys = derived(currentCachedTimeline, ($timeline) => collectKnownJsonKeys($timeline));

export const timelineItemsByUuid = derived(currentCachedTimeline, ($items) => buildTimelineItemsByUuid($items));

export const entityReferenceIndex = derived(currentCachedTimeline, ($items) => buildEntityReferenceIndex($items));

export const entityTimelineGroups = derived(
	[currentCachedEntities, currentCachedTimeline],
	([$entities, $items]) => buildEntityTimelineGroups($entities, $items)
);

export const entityTimelineEntityCount = derived(entityTimelineGroups, ($groups) =>
	$groups.reduce((total, group) => total + group.entities.length, 0)
);

export const dynamicTimelineFields = derived(currentCachedTimeline, ($items) => discoverTimelineDynamicFields($items));

export const eventDynamicFields = derived(dynamicTimelineFields, ($fields) => $fields.event);

export const actionDynamicFields = derived(dynamicTimelineFields, ($fields) => $fields.action);

export const eventTimelineRelationshipOptions = derived(currentCachedTimeline, ($items) =>
	buildTimelineRelationshipOptions($items, 'event')
);

export const actionTimelineRelationshipOptions = derived(currentCachedTimeline, ($items) =>
	buildTimelineRelationshipOptions($items, 'action')
);

function refreshSelectedIncidentTimeline(): void {
	const incident = get(currentSelectedIncident);
	if (incident?.uuid) {
		void updateIncidentCache(incident);
	}
}

export function isTimelineSocketEntityType(entityType: string): boolean {
	return TIMELINE_SOCKET_ENTITY_TYPES.has(entityType);
}

export function applyTimelineEntityUpsert(entityType: string, entity: any): boolean {
	switch (entityType) {
		case 'timeline_event':
			currentCachedTimeline.update((items) => upsertTimelineItem(items, createEventTimelineItem(entity)));
			return true;

		case 'investigation_action':
			currentCachedTimeline.update((items) => upsertTimelineItem(items, createActionTimelineItem(entity)));
			return true;

		case 'action_entities':
		case 'action_events':
		case 'event_entities':
			refreshSelectedIncidentTimeline();
			return true;

		default:
			return false;
	}
}

export function applyTimelineEntityRemoval(entityType: string, uuid: string): boolean {
	switch (entityType) {
		case 'timeline_event':
			currentCachedTimeline.update((items) => removeTimelineItem(items, 'event', uuid));
			return true;

		case 'investigation_action':
			currentCachedTimeline.update((items) => removeTimelineItem(items, 'action', uuid));
			return true;

		default:
			return false;
	}
}

export function applyTimelineJunctionUpdate(table: string, _data: any): boolean {
	if (!TIMELINE_JUNCTION_TYPES.has(table)) {
		return false;
	}

	refreshSelectedIncidentTimeline();
	return true;
}

export function applyTimelineJunctionDelete(table: string, _data: any): boolean {
	if (!TIMELINE_JUNCTION_TYPES.has(table)) {
		return false;
	}

	refreshSelectedIncidentTimeline();
	return true;
}