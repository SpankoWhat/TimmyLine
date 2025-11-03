import type { RequestHandler } from './$types';
import type { NewTimelineEvent } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	
	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	const timelineEventData: Partial<NewTimelineEvent> = {
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

	if (!timelineEventData) {
		throw error(400, 'Missing required timeline event data');
	}

	try {
		await db
		.update(schema.timeline_events)
		.set(timelineEventData)
		.where(eq(schema.timeline_events.uuid, body.uuid))
		.returning();

		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('core-entry-modified');

	} catch (err) {
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
 
	return json(true);
};