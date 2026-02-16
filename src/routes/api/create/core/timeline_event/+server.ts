import type { RequestHandler } from './$types';
import type { NewTimelineEvent } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { requireWriteAccess } from '$lib/server/auth/authorization';

export const POST: RequestHandler = async (event) => {
	await requireWriteAccess(event);
	const { request } = event;

	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	// Validate required fields
	const requiredFields = { incident_id: body.incident_id, discovered_by: body.discovered_by, event_type: body.event_type, discovered_at: body.discovered_at, event_data: body.event_data };
	const missingFields = Object.entries(requiredFields)
		.filter(([_, value]) => value === undefined || value === null || value === '')
		.map(([key]) => key);

	if (missingFields.length > 0) {
		throw error(400, `Missing required fields: ${missingFields.join(', ')}`);
	}

	const timelineEventData: NewTimelineEvent = {
		incident_id: body.incident_id,
		discovered_by: body.discovered_by,
		event_type: body.event_type,
		discovered_at: body.discovered_at,
		event_data: body.event_data,
		occurred_at: body.occurred_at,
		severity: body.severity,
		confidence: body.confidence,
		source_reliability: body.source_reliability,
		source: body.source,
		tags: body.tags
	};

	try {
		const [createdEvent] = await db
		.insert(schema.timeline_events)
		.values(timelineEventData)
		.returning();

		// Broadcast to all users in the incident room (including sender for confirmation)
		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('entity-created', 'timeline_event', createdEvent);

		return json(createdEvent);

	} catch (err) {
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};