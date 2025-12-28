import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { timeline_events } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const conditions: SQL[] = [];

	// Get all query parameters and build WHERE conditions
	const uuid = url.searchParams.get('uuid');
	const incident_id = url.searchParams.get('incident_id');
	const discovered_by = url.searchParams.get('discovered_by');
	const event_type = url.searchParams.get('event_type');
	const occurred_at = url.searchParams.get('occurred_at');
	const discovered_at = url.searchParams.get('discovered_at');
	const created_at = url.searchParams.get('created_at');
	const updated_at = url.searchParams.get('updated_at');
	const event_data = url.searchParams.get('event_data');
	const severity = url.searchParams.get('severity');
	const confidence = url.searchParams.get('confidence');
	const source_reliability = url.searchParams.get('source_reliability');
	const source = url.searchParams.get('source');
	const tags = url.searchParams.get('tags');
	const include_deleted = url.searchParams.get('include_deleted');

	// Add conditions only if parameters are provided and not empty
	if (uuid) conditions.push(eq(timeline_events.uuid, uuid));
	if (incident_id) conditions.push(eq(timeline_events.incident_id, incident_id));
	if (discovered_by) conditions.push(eq(timeline_events.discovered_by, discovered_by));
	if (event_type) conditions.push(eq(timeline_events.event_type, event_type));
	if (occurred_at) conditions.push(eq(timeline_events.occurred_at, parseInt(occurred_at)));
	if (discovered_at) conditions.push(eq(timeline_events.discovered_at, parseInt(discovered_at)));
	if (created_at) conditions.push(eq(timeline_events.created_at, parseInt(created_at)));
	if (updated_at) conditions.push(eq(timeline_events.updated_at, parseInt(updated_at)));
	if (event_data) conditions.push(eq(timeline_events.event_data, event_data));
	if (severity) conditions.push(eq(timeline_events.severity, severity as 'critical' | 'high' | 'medium' | 'low' | 'info'));
	if (confidence) conditions.push(eq(timeline_events.confidence, confidence as 'high' | 'medium' | 'low' | 'guess'));
	if (source_reliability) conditions.push(eq(timeline_events.source_reliability, source_reliability as 'A' | 'B' | 'C' | 'D' | 'E' | 'F'));
	if (source) conditions.push(eq(timeline_events.source, source));
	if (tags) conditions.push(eq(timeline_events.tags, tags));

	// Filter out soft-deleted items unless explicitly requested
	if (include_deleted !== 'true') {
		conditions.push(isNull(timeline_events.deleted_at));
	}

	// Execute query with combined conditions
	const results =
		conditions.length > 0
			? await db.select().from(timeline_events).where(and(...conditions))
			: await db.select().from(timeline_events);

	return json(results);
};
