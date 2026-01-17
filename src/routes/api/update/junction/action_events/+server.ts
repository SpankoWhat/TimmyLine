import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { and, eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	
	if (!body.action_id || !body.event_id) {
		throw error(400, 'Missing required fields: action_id, event_id');
	}

	const updateData = {
		relation_type: body.relation_type
	};

	try {
		const [updatedRelation] = await db
			.update(schema.action_events)
			.set(updateData)
			.where(and(
				eq(schema.action_events.action_id, body.action_id),
				eq(schema.action_events.event_id, body.event_id)
			))
			.returning();

		// Broadcast to all connected clients
		const io = getSocketIO();
		io.emit('junction-updated', 'action_events', updatedRelation);

		return json(updatedRelation);
	} catch (err) {
		throw error(500, `Database update error: ${(err as Error).message}`);
	}
};