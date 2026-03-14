import { writable, derived, get, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { api } from '$lib/client';
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
	data: TimelineEvent | InvestigationAction;
};

// ============================================================================
// CORE STATE STORES - Single Selected Items
// ============================================================================

export const currentSelectedIncident: Writable<Incident | null> = writable(null);
export const currentSelectedAnalyst: Writable<Analyst | null> = writable(null);

// ============================================================================
// UI PREFERENCE STORES
// ============================================================================

/**
 * Toggle to show/hide soft-deleted items in the UI
 * When true, API calls will include include_deleted=true parameter
 */
export const showDeletedItems: Writable<boolean> = writable(false);

/**
 * Currently active timeline view ID (e.g. 'log', 'vertical', 'graph').
 * Persisted in localStorage so preference survives page reloads.
 */
export const currentTimelineView: Writable<string> = writable('log');

// Hydrate from localStorage on init (browser only)
if (browser) {
	const savedView = localStorage.getItem('timmyline:timeline-view');
	if (savedView) currentTimelineView.set(savedView);
	currentTimelineView.subscribe((v) => localStorage.setItem('timmyline:timeline-view', v));
}

// ============================================================================
// CORE CACHE STORES - Collections
// ============================================================================

export const currentCachedIncidents: Writable<Incident[]> = writable([]);
export const currentCachedTimeline: Writable<TimelineItem[]> = writable([]);
export const currentCachedAnnotations: Writable<Annotation[]> = writable([]);
export const currentCachedEntities: Writable<Entity[]> = writable([]);

// ============================================================================
// UI HIGHLIGHT STORES
// ============================================================================

/**
 * Set of timeline item UUIDs that should be highlighted
 * Used for click-to-highlight feature in Entities/Annotations panel
 */
export const highlightedItemUuids: Writable<Set<string>> = writable(new Set());

/**
 * Clears all highlighted items
 */
export function clearHighlights(): void {
	highlightedItemUuids.set(new Set());
}

/**
 * Sets the highlighted items to a specific set of UUIDs
 */
export function setHighlights(uuids: string[]): void {
	highlightedItemUuids.set(new Set(uuids));
}

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
 * Current entity statistics for the current incident
 */
export const entityStats = derived(currentCachedEntities, ($entities) => ({
	total: $entities.length,
	typeCounts: $entities.reduce((acc, entity) => {
		acc[entity.entity_type] = (acc[entity.entity_type] || 0) + 1;
		return acc;
	}, {} as Record<string, number>)
}));




/**
 * Known JSON root keys extracted from event_data and action_data across the timeline.
 * Used by the JsonKeyValueEditor component to suggest existing keys when building JSON.
 * Automatically updates when cached events or actions change.
 */
export const knownJsonKeys = derived(
	currentCachedTimeline,
	($timeline) => {
		const eventKeys = new Set<string>();
		const actionKeys = new Set<string>();

		for (const item of $timeline) {
			const jsonField = item.type === 'event'
				? (item.data as any).event_data
				: (item.data as any).action_data;
			const targetSet = item.type === 'event' ? eventKeys : actionKeys;

			if (jsonField && typeof jsonField === 'string') {
				try {
					const parsed = JSON.parse(jsonField);
					if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
						for (const key of Object.keys(parsed)) {
							targetSet.add(key);
						}
					}
				} catch { /* skip invalid JSON */ }
			}
		}

		return {
			event: [...eventKeys].sort(),
			action: [...actionKeys].sort()
		};
	}
);

/**
 * Various timeline statistics, currently provides:
 * - Count of actions 
 * - Count of events
 */
export const investigationStats = derived(currentCachedTimeline, ($items) => ({
	total: $items.length,
	events: $items.filter((item) => item.type === 'event').length,
	actions: $items.filter((item) => item.type === 'action').length
}));

/**
 * Handles calling cache update functions when showDeletedItems changes
 * Ensures that caches reflect the current preference for showing deleted items
 * Only runs in browser to avoid SSR fetch issues
 */
showDeletedItems.subscribe(async (includeDeleted) => {
	if (!browser) return;
	await updateLookupCache();
	const incident = get(currentSelectedIncident);
	if (incident) {
		await updateIncidentCache(incident);
	}
});

// ============================================================================
// CACHE UPDATE FUNCTIONS
// ============================================================================

/**
 * Fetches and updates incident-specific data (timeline events, actions, annotations, entities)
 * Called automatically when currentSelectedIncident changes
 * Now uses enriched endpoint to get events/actions with their relationships
 * Only runs in browser to avoid SSR fetch issues with relative URLs
 */
export async function updateIncidentCache(incident: Incident): Promise<void> {
	if (!browser) return;
	try {
		const includeDeleted = get(showDeletedItems);

		const [timelineData, annotationsData, entitiesData] = await Promise.all([
			api.timeline.getEnriched({ incident_id: incident.uuid, include_deleted: includeDeleted || undefined }),
			api.annotations.list({ incident_id: incident.uuid, include_deleted: includeDeleted || undefined }),
			api.entities.list({ incident_id: incident.uuid, include_deleted: includeDeleted || undefined })
		]);

		// Extract events and actions from enriched response
		const { events, actions } = timelineData as { events: any[], actions: any[] };

		// Build unified timeline
		const timelineItems: TimelineItem[] = [
			...events.map((event: any) => ({
				uuid: event.uuid,
				type: 'event' as const,
				timestamp: event.occurred_at || event.discovered_at || 0,
				data: event
			})),
			...actions.map((action: any) => ({
				uuid: action.uuid,
				type: 'action' as const,
				timestamp: action.performed_at || 0,
				data: action
			}))
		];
		timelineItems.sort((a, b) => a.timestamp - b.timestamp);
		currentCachedTimeline.set(timelineItems);
		currentCachedAnnotations.set(annotationsData as unknown as Annotation[]);
		currentCachedEntities.set(entitiesData as unknown as Entity[]);
	} catch (error) {
		console.error('Failed to update incident cache:', error);
		// Reset stores on error
		currentCachedTimeline.set([]);
		currentCachedAnnotations.set([]);
		currentCachedEntities.set([]);
	}
}

/**
 * Fetches and updates all lookup tables and incidents list
 * Should be called on app initialization or when reference data changes
 * Only runs in browser to avoid SSR fetch issues with relative URLs
 */
export async function updateLookupCache(): Promise<void> {
	if (!browser) return;
	try {
		const includeDeleted = get(showDeletedItems);

		const [
			eventTypesData,
			actionTypesData,
			entityTypesData,
			annotationTypesData,
			relationTypesData,
			analystsData,
			incidentsData
		] = await Promise.all([
			api.lookups.list('event_type'),
			api.lookups.list('action_type'),
			api.lookups.list('entity_type'),
			api.lookups.list('annotation_type'),
			api.lookups.list('relation_type'),
			api.analysts.list({ include_deleted: includeDeleted || undefined }),
			api.incidents.list({ include_deleted: includeDeleted || undefined })
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
			currentCachedTimeline.set([]);
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
	console.log(`%c[CACHE-UPSERT] entityType=${entityType} | uuid=${entity?.uuid ?? 'N/A'}`, 'color: #00ccff; font-weight: bold', entity);
	switch (entityType) {
		case 'timeline_event':
			currentCachedTimeline.update((items) => {
				const index = items.findIndex((i) => i.type === 'event' && i.uuid === entity.uuid);
				const newItem: TimelineItem = {
					uuid: entity.uuid,
					type: 'event',
					timestamp: entity.occurred_at || entity.discovered_at || 0,
					data: entity
				};
				const newItems = index >= 0
					? items.map((item, i) => (i === index ? newItem : item))
					: [...items, newItem];
				return newItems.sort((a, b) => a.timestamp - b.timestamp);
			});
			break;

		case 'investigation_action':
			currentCachedTimeline.update((items) => {
				const index = items.findIndex((i) => i.type === 'action' && i.uuid === entity.uuid);
				const newItem: TimelineItem = {
					uuid: entity.uuid,
					type: 'action',
					timestamp: entity.performed_at || 0,
					data: entity
				};
				const newItems = index >= 0
					? items.map((item, i) => (i === index ? newItem : item))
					: [...items, newItem];
				return newItems.sort((a, b) => a.timestamp - b.timestamp);
			});
			break;

		case 'annotation':
			currentCachedAnnotations.update((annotations) => {
				const index = annotations.findIndex((a) => a.uuid === entity.uuid);
				return index >= 0
					? annotations.map((item, i) => (i === index ? entity : item))
					: [...annotations, entity];
			});
			break;

		case 'entity':
			currentCachedEntities.update((entities) => {
				const index = entities.findIndex((e) => e.uuid === entity.uuid);
				return index >= 0
					? entities.map((item, i) => (i === index ? entity : item))
					: [...entities, entity];
			});
			break;

		case 'incident':
			currentCachedIncidents.update((incidents) => {
				const index = incidents.findIndex((i) => i.uuid === entity.uuid);
				return index >= 0
					? incidents.map((item, i) => (i === index ? entity : item))
					: [...incidents, entity];
			});
			break;

		// Need to refactor this to efficiently update nested entities. 
		// The return from the socket event is:
		// { action_id: "1da0da81-1309-4d16-972f-e4339e32b529", entity_id: "677c8460-a818-46a8-8ec5-d5eec19baaeb", relation_type: "source" }
		case 'action_entities':
			updateIncidentCache(get(currentSelectedIncident)!);
			break;

		case 'action_events':
			updateIncidentCache(get(currentSelectedIncident)!);
			break;

		case 'event_entities':
			updateIncidentCache(get(currentSelectedIncident)!);
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
	console.log(`%c[CACHE-REMOVE] entityType=${entityType} | uuid=${uuid}`, 'color: #ff6666; font-weight: bold');
	switch (entityType) {
		case 'timeline_event':
			currentCachedTimeline.update((items) => items.filter((i) => !(i.type === 'event' && i.uuid === uuid)));
			break;

		case 'investigation_action':
			currentCachedTimeline.update((items) => items.filter((i) => !(i.type === 'action' && i.uuid === uuid)));
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