import { writable, derived, get, type Writable } from 'svelte/store';
import type {
	Incident,
	TimelineEvent,
	InvestigationAction,
	Annotation,
	Entity,
	Analyst,
	EventType,
	ActionType,
	EntityType,
	AnnotationType,
	RelationType
} from '$lib/server/database';

// ============================================================================
// TIMELINE TYPES
// ============================================================================

/**
 * Generic timeline item that can represent either an event or action
 * Contains minimal info for display with reference to full data
 */
export type TimelineItem = {
	uuid: string;
	type: 'event' | 'action' | 'annotation';
	timestamp: number;
	displayType: 'EVENT' | 'ACTION' | 'ANNOTATION';
	// Reference to the full data object
	data: TimelineEvent | InvestigationAction | Annotation;
};

// ============================================================================
// CORE STATE STORES - Single Selected Items
// ============================================================================

export const currentSelectedIncident: Writable<Incident | null> = writable(null);
export const currentSelectedAnalyst: Writable<Analyst | null> = writable(null);

// ============================================================================
// CORE CACHE STORES - Collections
// ============================================================================

export const currentCachedIncidents: Writable<Incident[]> = writable([]);
export const currentCachedEvents: Writable<TimelineEvent[]> = writable([]);
export const currentCachedActions: Writable<InvestigationAction[]> = writable([]);
export const currentCachedAnnotations: Writable<Annotation[]> = writable([]);
export const currentCachedEntities: Writable<Entity[]> = writable([]);

// ============================================================================
// LOOKUP CACHE STORES - Reference Data
// ============================================================================

export const eventTypes: Writable<EventType[]> = writable([]);
export const actionTypes: Writable<ActionType[]> = writable([]);
export const entityTypes: Writable<EntityType[]> = writable([]);
export const annotationTypes: Writable<AnnotationType[]> = writable([]);
export const relationTypes: Writable<RelationType[]> = writable([]);
export const analysts: Writable<Analyst[]> = writable([]);

// ============================================================================
// DERIVED STORES - Computed Values
// ============================================================================

/**
 * Incident statistics derived from cached incidents
 * Automatically updates when currentCachedIncidents changes
 */
export const incidentStats = derived(currentCachedIncidents, ($incidents) => ({
	total: $incidents.length,
	critical: $incidents.filter((i) => i.priority === 'critical').length,
	high: $incidents.filter((i) => i.priority === 'high').length,
	medium: $incidents.filter((i) => i.priority === 'medium').length,
	low: $incidents.filter((i) => i.priority === 'low').length,
	inProgress: $incidents.filter((i) => i.status === 'In Progress').length,
	postMortem: $incidents.filter((i) => i.status === 'Post-Mortem').length,
	closed: $incidents.filter((i) => i.status === 'Closed').length
}));

/**
 * Timeline event statistics for the current incident
 */
export const timelineStats = derived(currentCachedEvents, ($events) => ({
	total: $events.length,
	critical: $events.filter((e) => e.severity === 'critical').length,
	high: $events.filter((e) => e.severity === 'high').length,
	medium: $events.filter((e) => e.severity === 'medium').length,
	low: $events.filter((e) => e.severity === 'low').length
}));

/**
 * Investigation action statistics for the current incident
 */
export const actionStats = derived(currentCachedActions, ($actions) => ({
	total: $actions.length,
	success: $actions.filter((a) => a.result === 'success').length,
	failed: $actions.filter((a) => a.result === 'failed').length,
	partial: $actions.filter((a) => a.result === 'partial').length,
	pending: $actions.filter((a) => a.result === 'pending').length
}));

/**
 * Combined timeline of events and actions, sorted by timestamp
 * Automatically updates when timeline events or investigation actions change
 */
export const combinedTimeline = derived(
	[currentCachedEvents, currentCachedActions],
	([$events, $actions]) => {
		const timeline: TimelineItem[] = [];

		// Add timeline events
		if ($events && Array.isArray($events)) {
			const timelineEvents: TimelineItem[] = $events.map((event) => ({
				uuid: event.uuid,
				type: 'event' as const,
				timestamp: event.occurred_at || event.discovered_at || 0,
				displayType: 'EVENT' as const,
				data: event
			}));
			timeline.push(...timelineEvents);
		}

		// Add investigation actions
		if ($actions && Array.isArray($actions)) {
			const investigationActions: TimelineItem[] = $actions.map((action) => ({
				uuid: action.uuid,
				type: 'action' as const,
				timestamp: action.performed_at || 0,
				displayType: 'ACTION' as const,
				data: action
			}));
			timeline.push(...investigationActions);
		}
		// Sort by timestamp (ascending order - oldest first)
		timeline.sort((a, b) => a.timestamp - b.timestamp);

		return timeline;
	}
);

// ============================================================================
// CACHE UPDATE FUNCTIONS
// ============================================================================

/**
 * Fetches and updates incident-specific data (timeline events, actions, annotations, entities)
 * Called automatically when currentSelectedIncident changes
 */
export async function updateIncidentCache(incident: Incident): Promise<void> {
	try {
		const [eventsRes, actionsRes, annotationsRes, entitiesRes] = await Promise.all([
			fetch(`/api/read/core/timeline_events?incident_id=${incident.uuid}`),
			fetch(`/api/read/core/investigation_actions?incident_id=${incident.uuid}`),
			fetch(`/api/read/core/annotations?incident_id=${incident.uuid}`),
			fetch(`/api/read/core/entities?incident_id=${incident.uuid}`)
		]);

		const [events, actions, annotations, entities] = await Promise.all([
			eventsRes.json(),
			actionsRes.json(),
			annotationsRes.json(),
			entitiesRes.json()
		]);

		currentCachedEvents.set(events as TimelineEvent[]);
		currentCachedActions.set(actions as InvestigationAction[]);
		currentCachedAnnotations.set(annotations as Annotation[]);
		currentCachedEntities.set(entities as Entity[]);
	} catch (error) {
		console.error('Failed to update incident cache:', error);
		// Reset stores on error
		currentCachedEvents.set([]);
		currentCachedActions.set([]);
		currentCachedAnnotations.set([]);
		currentCachedEntities.set([]);
	}
}

/**
 * Fetches and updates all lookup tables and incidents list
 * Should be called on app initialization or when reference data changes
 */
export async function updateLookupCache(): Promise<void> {
	try {
		const [
			eventTypesRes,
			actionTypesRes,
			entityTypesRes,
			annotationTypesRes,
			relationTypesRes,
			analystsRes,
			incidentsRes
		] = await Promise.all([
			fetch('/api/read/lookup?table=event_type'),
			fetch('/api/read/lookup?table=action_type'),
			fetch('/api/read/lookup?table=entity_type'),
			fetch('/api/read/lookup?table=annotation_type'),
			fetch('/api/read/lookup?table=relation_type'),
			fetch('/api/read/core/analysts'),
			fetch('/api/read/core/incidents'),
		]);

		const [
			eventTypesData,
			actionTypesData,
			entityTypesData,
			annotationTypesData,
			relationTypesData,
			analystsData,
			incidentsData
		] = await Promise.all([
			eventTypesRes.json(),
			actionTypesRes.json(),
			entityTypesRes.json(),
			annotationTypesRes.json(),
			relationTypesRes.json(),
			analystsRes.json(),
			incidentsRes.json()
		]);

		eventTypes.set(eventTypesData as EventType[]);
		actionTypes.set(actionTypesData as ActionType[]);
		entityTypes.set(entityTypesData as EntityType[]);
		annotationTypes.set(annotationTypesData as AnnotationType[]);
		relationTypes.set(relationTypesData as RelationType[]);
		analysts.set(analystsData as Analyst[]);
		currentCachedIncidents.set(incidentsData as Incident[]);
	} catch (error) {
		console.error('Failed to update lookup cache:', error);
		// Don't reset stores on error - keep existing data
	}
}

/**
 * Initializes all caches if an incident is selected
 */
export async function initializeAllCaches(): Promise<void> {
	await updateLookupCache();
	const incident = get(currentSelectedIncident);
	if (incident) {
		await updateIncidentCache(incident);
	}
}

// ============================================================================
// HELPER FUNCTION FOR COMPONENT-LEVEL SUBSCRIPTION
// ============================================================================

/**
 * Sets up reactive incident cache updates
 * Call this from your layout component's onMount
 * Returns an unsubscribe function for cleanup
 */
export function setupIncidentWatcher() {
	return currentSelectedIncident.subscribe((incident) => {
		if (incident?.uuid) {
			updateIncidentCache(incident);
		} else if (incident === null) {
			// Only clear if explicitly set to null (not undefined during initialization)
			currentCachedEvents.set([]);
			currentCachedActions.set([]);
			currentCachedAnnotations.set([]);
			currentCachedEntities.set([]);
		}
	});
}

// ============================================================================
// INCREMENTAL CACHE UPDATE FUNCTIONS (for Socket.IO sync)
// ============================================================================

/**
 * Add or update a single entity in the appropriate cache store
 * Called when receiving socket events for real-time updates
 */
export function upsertEntity(entityType: string, entity: any) {
	switch (entityType) {
		case 'timeline_event':
			currentCachedEvents.update((events) => {
				const index = events.findIndex((e) => e.uuid === entity.uuid);
				if (index >= 0) {
					events[index] = entity;
				} else {
					events.push(entity);
				}
				return events;
			});
			break;

		case 'investigation_action':
			currentCachedActions.update((actions) => {
				const index = actions.findIndex((a) => a.uuid === entity.uuid);
				if (index >= 0) {
					actions[index] = entity;
				} else {
					actions.push(entity);
				}
				return actions;
			});
			break;

		case 'annotation':
			currentCachedAnnotations.update((annotations) => {
				const index = annotations.findIndex((a) => a.uuid === entity.uuid);
				if (index >= 0) {
					annotations[index] = entity;
				} else {
					annotations.push(entity);
				}
				return annotations;
			});
			break;

		case 'entity':
			currentCachedEntities.update((entities) => {
				const index = entities.findIndex((e) => e.uuid === entity.uuid);
				if (index >= 0) {
					entities[index] = entity;
				} else {
					entities.push(entity);
				}
				return entities;
			});
			break;

		case 'incident':
			currentCachedIncidents.update((incidents) => {
				const index = incidents.findIndex((i) => i.uuid === entity.uuid);
				if (index >= 0) {
					incidents[index] = entity;
				} else {
					incidents.push(entity);
				}
				return incidents;
			});
			break;

		default:
			console.warn(`Unknown entity type for upsert: ${entityType}`);
	}
}

/**
 * Remove a single entity from the appropriate cache store
 * Called when receiving socket events for deletions
 */
export function removeEntity(entityType: string, uuid: string) {
	switch (entityType) {
		case 'timeline_event':
			currentCachedEvents.update((events) => events.filter((e) => e.uuid !== uuid));
			break;

		case 'investigation_action':
			currentCachedActions.update((actions) => actions.filter((a) => a.uuid !== uuid));
			break;

		case 'annotation':
			currentCachedAnnotations.update((annotations) => annotations.filter((a) => a.uuid !== uuid));
			break;

		case 'entity':
			currentCachedEntities.update((entities) => entities.filter((e) => e.uuid !== uuid));
			break;

		case 'incident':
			currentCachedIncidents.update((incidents) => incidents.filter((i) => i.uuid !== uuid));
			break;

		default:
			console.warn(`Unknown entity type for remove: ${entityType}`);
	}
}

/**
 * Update lookup table cache
 * Called when receiving socket events for lookup table changes
 */
export function updateLookupTable(lookupType: string, data: any[]) {
	switch (lookupType) {
		case 'event_type':
			eventTypes.set(data);
			break;

		case 'action_type':
			actionTypes.set(data);
			break;

		case 'entity_type':
			entityTypes.set(data);
			break;

		case 'annotation_type':
			annotationTypes.set(data);
			break;

		case 'relation_type':
			relationTypes.set(data);
			break;

		case 'analyst':
			analysts.set(data);
			break;

		default:
			console.warn(`Unknown lookup type: ${lookupType}`);
	}
}