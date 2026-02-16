import type { RequestHandler } from './$types';
import type { NewTimelineEvent } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';
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

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	if (body.severity && !['critical', 'high', 'medium', 'low', 'info'].includes(body.severity)) {
		throw error(400, `Invalid severity value: ${body.severity}`);
	}

	if (body.confidence && !['high', 'medium', 'low', 'guess'].includes(body.confidence)) {
		throw error(400, `Invalid confidence value: ${body.confidence}`);
	}

	if (body.source_reliability && !['A', 'B', 'C', 'D', 'E', 'F'].includes(body.source_reliability)) {
		throw error(400, `Invalid source_reliability value: ${body.source_reliability}`);
	}

	const timelineEventData: Partial<NewTimelineEvent> = {
		incident_id: body.incident_id,
		discovered_by: body.discovered_by,
		event_type: body.event_type,
		discovered_at: body.discovered_at,
		notes: body.notes,
		event_data: body.event_data,
		occurred_at: body.occurred_at,
		severity: body.severity,
		confidence: body.confidence,
		source_reliability: body.source_reliability,
		source: body.source,
		tags: body.tags,
		updated_at: Math.floor(Date.now() / 1000)
	};

	const cleanedData = Object.fromEntries(
		Object.entries(timelineEventData).filter(([_, v]) => v !== undefined)
	);

	try {
		const [updatedEvent] = await db
		.update(schema.timeline_events)
		.set(cleanedData)
		.where(eq(schema.timeline_events.uuid, body.uuid))
		.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('entity-updated', 'timeline_event', updatedEvent);

		return json(updatedEvent);
	} catch (err) {
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
};