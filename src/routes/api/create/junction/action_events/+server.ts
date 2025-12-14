import type { RequestHandler } from './$types';
import type { NewActionEvent } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	
	const actionEventData: NewActionEvent = {
		action_id: body.action_uuid,
		event_id: body.event_uuid,
		relation_type: body.relation_type
	};

	if (!actionEventData.action_id || !actionEventData.event_id || !actionEventData.relation_type) {
		throw error(400, 'Missing required fields: action_uuid, event_uuid, and relation_type');
	}

	try {
		const [createdRelation] = await db
			.insert(schema.action_events)
			.values(actionEventData)
			.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		if (body.incident_id) {
			io.to(`incident:${body.incident_id}`).emit('entity-created', 'action_events', createdRelation);
		}

		return json(createdRelation);

	} catch (err) {
		throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};
