import { writable, derived, get, type Writable} from 'svelte/store';
import { browser } from '$app/environment';
import { initializeSocket, getSocket } from './socketStore';
import { joinIncidentWithPresence, leaveIncidentWithPresence } from './presenceStore';
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
	type: 'event' | 'action';
	timestamp: number;
	displayType: 'EVENT' | 'ACTION';
	// Reference to the full data object
	data: TimelineEvent | InvestigationAction;
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
export const currentCachedTimelineEvents: Writable<TimelineEvent[]> = writable([]);
export const currentCachedInvestigationActions: Writable<InvestigationAction[]> = writable([]);
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
export const timelineStats = derived(currentCachedTimelineEvents, ($events) => ({
	total: $events.length,
	critical: $events.filter((e) => e.severity === 'critical').length,
	high: $events.filter((e) => e.severity === 'high').length,
	medium: $events.filter((e) => e.severity === 'medium').length,
	low: $events.filter((e) => e.severity === 'low').length
}));

/**
 * Investigation action statistics for the current incident
 */
export const actionStats = derived(currentCachedInvestigationActions, ($actions) => ({
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
	[currentCachedTimelineEvents, currentCachedInvestigationActions],
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

		currentCachedTimelineEvents.set(events as TimelineEvent[]);
		currentCachedInvestigationActions.set(actions as InvestigationAction[]);
		currentCachedAnnotations.set(annotations as Annotation[]);
		currentCachedEntities.set(entities as Entity[]);
	} catch (error) {
		console.error('Failed to update incident cache:', error);
		// Reset stores on error
		currentCachedTimelineEvents.set([]);
		currentCachedInvestigationActions.set([]);
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
 * Initialize all caches - call this on app mount
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
			currentCachedTimelineEvents.set([]);
			currentCachedInvestigationActions.set([]);
			currentCachedAnnotations.set([]);
			currentCachedEntities.set([]);
		}
	});
}

// ============================================================================
// SOCKET INTEGRATION
// ============================================================================

let socketInitialized = false;
let previousIncidentUuid: string | null = null;

/**
 * Initialize socket connection and set up real-time sync
 * Call this once during app initialization
 */
export function initializeCacheSync() {
	if (!browser || socketInitialized) return;

	socketInitialized = true;
	const socket = initializeSocket();

	if (!socket) {
		console.error('Failed to initialize socket');
		return;
	}

	// Listen for data updates from other users
	socket.on('core-entry-modified', async () => {
		console.log('Real-time update received: core-entry-modified');
		const incident = get(currentSelectedIncident);
		if (incident) {
			await updateIncidentCache(incident);
		}
	});

	// Auto-join/leave incident rooms when selection changes
	currentSelectedIncident.subscribe((incident) => {
		// Leave previous incident room
		if (previousIncidentUuid) {
			leaveIncidentWithPresence(previousIncidentUuid);
		}

		// Join new incident room
		if (incident?.uuid) {
			joinIncidentWithPresence(incident.uuid);
			previousIncidentUuid = incident.uuid;
		} else {
			previousIncidentUuid = null;
		}
	});

	console.log('✅ Cache sync with Socket.IO initialized');
} 