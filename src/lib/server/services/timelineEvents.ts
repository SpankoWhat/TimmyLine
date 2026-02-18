/**
 * Timeline Events Service
 *
 * Single source of truth for all timeline_events CRUD operations,
 * validation, and Socket.IO broadcasting. Called by both API routes
 * and MCP tool handlers.
 */

import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { timeline_events } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ServiceError, validateRequired, validateEnum, stripUndefined, type ServiceContext } from './types';
import type { NewTimelineEvent } from '$lib/server/database';

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_VALUES = ['critical', 'high', 'medium', 'low', 'info'] as const;
const CONFIDENCE_VALUES = ['high', 'medium', 'low', 'guess'] as const;
const SOURCE_RELIABILITY_VALUES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

// ============================================================================
// List
// ============================================================================

export interface ListTimelineEventsParams {
	uuid?: string;
	incident_id?: string;
	discovered_by?: string;
	event_type?: string;
	occurred_at?: number;
	discovered_at?: number;
	created_at?: number;
	updated_at?: number;
	notes?: string;
	event_data?: string;
	severity?: string;
	confidence?: string;
	source_reliability?: string;
	source?: string;
	tags?: string;
	include_deleted?: boolean;
}

export async function listTimelineEvents(params: ListTimelineEventsParams) {
	const conditions: SQL[] = [];

	if (params.uuid) conditions.push(eq(timeline_events.uuid, params.uuid));
	if (params.incident_id) conditions.push(eq(timeline_events.incident_id, params.incident_id));
	if (params.discovered_by) conditions.push(eq(timeline_events.discovered_by, params.discovered_by));
	if (params.event_type) conditions.push(eq(timeline_events.event_type, params.event_type));
	if (params.occurred_at !== undefined) conditions.push(eq(timeline_events.occurred_at, params.occurred_at));
	if (params.discovered_at !== undefined) conditions.push(eq(timeline_events.discovered_at, params.discovered_at));
	if (params.created_at !== undefined) conditions.push(eq(timeline_events.created_at, params.created_at));
	if (params.updated_at !== undefined) conditions.push(eq(timeline_events.updated_at, params.updated_at));
	if (params.notes) conditions.push(eq(timeline_events.notes, params.notes));
	if (params.event_data) conditions.push(eq(timeline_events.event_data, params.event_data));
	if (params.severity) conditions.push(eq(timeline_events.severity, params.severity as typeof SEVERITY_VALUES[number]));
	if (params.confidence) conditions.push(eq(timeline_events.confidence, params.confidence as typeof CONFIDENCE_VALUES[number]));
	if (params.source_reliability) conditions.push(eq(timeline_events.source_reliability, params.source_reliability as typeof SOURCE_RELIABILITY_VALUES[number]));
	if (params.source) conditions.push(eq(timeline_events.source, params.source));
	if (params.tags) conditions.push(eq(timeline_events.tags, params.tags));

	// Filter out soft-deleted unless explicitly requested
	if (!params.include_deleted) {
		conditions.push(isNull(timeline_events.deleted_at));
	}

	const results =
		conditions.length > 0
			? await db.select().from(timeline_events).where(and(...conditions))
			: await db.select().from(timeline_events);

	return results;
}

// ============================================================================
// Create
// ============================================================================

export interface CreateTimelineEventData {
	incident_id: string;
	discovered_by: string;
	event_type: string;
	discovered_at: number;
	event_data: string;
	occurred_at?: number;
	notes?: string;
	severity?: string;
	confidence?: string;
	source_reliability?: string;
	source?: string;
	tags?: string;
}

export async function createTimelineEvent(data: CreateTimelineEventData, ctx: ServiceContext) {
	validateRequired(data as unknown as Record<string, unknown>, [
		'incident_id',
		'discovered_by',
		'event_type',
		'discovered_at',
		'event_data'
	]);

	validateEnum('severity', data.severity, SEVERITY_VALUES);
	validateEnum('confidence', data.confidence, CONFIDENCE_VALUES);
	validateEnum('source_reliability', data.source_reliability, SOURCE_RELIABILITY_VALUES);

	const insertData: NewTimelineEvent = {
		incident_id: data.incident_id,
		discovered_by: data.discovered_by,
		event_type: data.event_type,
		discovered_at: data.discovered_at,
		event_data: data.event_data,
		occurred_at: data.occurred_at,
		notes: data.notes,
		severity: data.severity as NewTimelineEvent['severity'],
		confidence: data.confidence as NewTimelineEvent['confidence'],
		source_reliability: data.source_reliability as NewTimelineEvent['source_reliability'],
		source: data.source,
		tags: data.tags
	};

	const [created] = await db
		.insert(schema.timeline_events)
		.values(insertData)
		.returning();

	// Broadcast to all users in the incident room
	const io = getSocketIO();
	io.to(`incident:${data.incident_id}`).emit('entity-created', 'timeline_event', created);

	return created;
}

// ============================================================================
// Update
// ============================================================================

export interface UpdateTimelineEventData {
	uuid: string;
	incident_id?: string;
	discovered_by?: string;
	event_type?: string;
	discovered_at?: number;
	occurred_at?: number;
	notes?: string;
	event_data?: string;
	severity?: string;
	confidence?: string;
	source_reliability?: string;
	source?: string;
	tags?: string;
}

export async function updateTimelineEvent(data: UpdateTimelineEventData, ctx: ServiceContext) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);

	validateEnum('severity', data.severity, SEVERITY_VALUES);
	validateEnum('confidence', data.confidence, CONFIDENCE_VALUES);
	validateEnum('source_reliability', data.source_reliability, SOURCE_RELIABILITY_VALUES);

	const updateData = stripUndefined({
		incident_id: data.incident_id,
		discovered_by: data.discovered_by,
		event_type: data.event_type,
		discovered_at: data.discovered_at,
		occurred_at: data.occurred_at,
		notes: data.notes,
		event_data: data.event_data,
		severity: data.severity as NewTimelineEvent['severity'],
		confidence: data.confidence as NewTimelineEvent['confidence'],
		source_reliability: data.source_reliability as NewTimelineEvent['source_reliability'],
		source: data.source,
		tags: data.tags,
		updated_at: Math.floor(Date.now() / 1000)
	});

	const [updated] = await db
		.update(schema.timeline_events)
		.set(updateData)
		.where(eq(schema.timeline_events.uuid, data.uuid))
		.returning();

	// Broadcast to all users in the incident room
	const io = getSocketIO();
	io.to(`incident:${data.incident_id}`).emit('entity-updated', 'timeline_event', updated);

	return updated;
}

// ============================================================================
// Delete (soft)
// ============================================================================

export interface DeleteTimelineEventData {
	uuid: string;
	incident_id?: string;
}

export async function deleteTimelineEvent(data: DeleteTimelineEventData, ctx: ServiceContext) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);

	await db
		.update(timeline_events)
		.set({
			deleted_at: Math.floor(Date.now() / 1000),
			updated_at: Math.floor(Date.now() / 1000)
		})
		.where(eq(timeline_events.uuid, data.uuid))
		.returning();

	// Broadcast to all users in the incident room (if incident_id provided)
	if (data.incident_id) {
		const io = getSocketIO();
		io.to(`incident:${data.incident_id}`).emit('entity-deleted', 'timeline_event', data.uuid);
	}

	return true;
}
