import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { timeline_events } from '$lib/server/database';
import { eq } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	try {
		await db
			.delete(timeline_events)
			.where(eq(timeline_events.uuid, body.uuid))
			.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		if (body.incident_id) {
			io.to(`incident:${body.incident_id}`).emit('entity-deleted', 'timeline_event', body.uuid);
		}

	} catch (err) {
		throw error(500, `Database deletion error: ${(err as Error).message}`);
	}

	return json(true);
};
