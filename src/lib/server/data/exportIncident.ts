/**
 * Incident Export Data Aggregation
 *
 * Queries all data for a given incident and returns a single
 * self-contained payload suitable for rendering into a static HTML export.
 */

import { db } from '$lib/server';
import { inArray } from 'drizzle-orm';
import {
	incidents,
	analysts,
	annotations,
	entities,
	event_type,
	action_type,
	entity_type,
	annotation_type,
	relation_type,
	type Incident,
	type Analyst,
	type Annotation,
	type Entity,
	type EnrichedTimelineEvent,
	type EnrichedInvestigationAction
} from '$lib/server/database';

// ============================================================================
// Export Payload Types
// ============================================================================

export interface ExportTimelineItem {
	uuid: string;
	type: 'event' | 'action';
	timestamp: number;
	displayType: 'EVENT' | 'ACTION';
	data: Record<string, unknown>;
}

export interface ExportPayload {
	exportedAt: string;
	appVersion: string;
	incident: Incident;
	timeline: ExportTimelineItem[];
	entities: Entity[];
	annotations: Annotation[];
	analysts: Record<string, Analyst>;
	lookups: {
		eventTypes: Array<{ name: string; description: string | null }>;
		actionTypes: Array<{ name: string; description: string | null }>;
		entityTypes: Array<{ name: string; description: string | null }>;
		annotationTypes: Array<{ name: string; description: string | null }>;
		relationTypes: Array<{ name: string; description: string | null }>;
	};
	stats: {
		totalItems: number;
		events: number;
		actions: number;
		entities: number;
		annotations: number;
	};
}

// ============================================================================
// Data Aggregation
// ============================================================================

/**
 * Aggregates all data for a single incident into an export payload.
 * Queries events (with entity relations), actions (with event+entity relations),
 * entities, annotations, relevant analysts, and all lookup tables.
 */
export async function aggregateIncidentData(incidentId: string): Promise<ExportPayload> {
	// 1. Fetch the incident
	const incident = await db.query.incidents.findFirst({
		where: (inc, { eq }) => eq(inc.uuid, incidentId)
	});

	if (!incident) {
		throw new Error(`Incident not found: ${incidentId}`);
	}

	// 2. Fetch enriched events & actions in parallel (same pattern as timeline_enriched endpoint)
	const [enrichedEvents, enrichedActions, incidentEntities, incidentAnnotations, allLookups] =
		await Promise.all([
			// Events with related entities
			db.query.timeline_events.findMany({
				where: (events, { eq, and, isNull }) =>
					and(eq(events.incident_id, incidentId), isNull(events.deleted_at)),
				with: {
					eventEntities: {
						with: {
							entity: true
						}
					}
				}
			}),

			// Actions with related events + entities
			db.query.investigation_actions.findMany({
				where: (actions, { eq, and, isNull }) =>
					and(eq(actions.incident_id, incidentId), isNull(actions.deleted_at)),
				with: {
					actionEvents: {
						with: {
							event: true
						}
					},
					actionEntities: {
						with: {
							entity: true
						}
					}
				}
			}),

			// All entities for this incident
			db.query.entities.findMany({
				where: (ent, { eq, and, isNull }) =>
					and(eq(ent.incident_id, incidentId), isNull(ent.deleted_at))
			}),

			// All annotations for this incident
			db.query.annotations.findMany({
				where: (ann, { eq, and, isNull }) =>
					and(eq(ann.incident_id, incidentId), isNull(ann.deleted_at))
			}),

			// All lookup tables
			Promise.all([
				db.select().from(event_type),
				db.select().from(action_type),
				db.select().from(entity_type),
				db.select().from(annotation_type),
				db.select().from(relation_type)
			])
		]);

	// 3. Collect all unique analyst UUIDs referenced across the data
	const analystUuids = new Set<string>();
	for (const e of enrichedEvents) {
		if (e.discovered_by) analystUuids.add(e.discovered_by);
	}
	for (const a of enrichedActions) {
		if (a.actioned_by) analystUuids.add(a.actioned_by);
	}
	for (const ann of incidentAnnotations) {
		if (ann.noted_by) analystUuids.add(ann.noted_by);
	}
	for (const ent of incidentEntities) {
		if (ent.entered_by) analystUuids.add(ent.entered_by);
	}

	// 4. Fetch referenced analysts
	const analystMap: Record<string, Analyst> = {};
	if (analystUuids.size > 0) {
		const analystList = await db
			.select()
			.from(analysts)
			.where(inArray(analysts.uuid, [...analystUuids]));
		for (const a of analystList) {
			analystMap[a.uuid] = a;
		}
	}

	// 5. Build the combined timeline (same merge logic as cacheStore.combinedTimeline)
	const timeline: ExportTimelineItem[] = [];

	for (const event of enrichedEvents) {
		timeline.push({
			uuid: event.uuid,
			type: 'event',
			timestamp: event.occurred_at || event.discovered_at || 0,
			displayType: 'EVENT',
			data: event as unknown as Record<string, unknown>
		});
	}

	for (const action of enrichedActions) {
		timeline.push({
			uuid: action.uuid,
			type: 'action',
			timestamp: action.performed_at || 0,
			displayType: 'ACTION',
			data: action as unknown as Record<string, unknown>
		});
	}

	// Sort ascending by timestamp
	timeline.sort((a, b) => a.timestamp - b.timestamp);

	// 6. Assemble the payload
	const [eventTypes, actionTypes, entityTypes, annotationTypes, relationTypes] = allLookups;

	return {
		exportedAt: new Date().toISOString(),
		appVersion: '1.0.0',
		incident,
		timeline,
		entities: incidentEntities,
		annotations: incidentAnnotations,
		analysts: analystMap,
		lookups: {
			eventTypes,
			actionTypes,
			entityTypes,
			annotationTypes,
			relationTypes
		},
		stats: {
			totalItems: timeline.length,
			events: enrichedEvents.length,
			actions: enrichedActions.length,
			entities: incidentEntities.length,
			annotations: incidentAnnotations.length
		}
	};
}
