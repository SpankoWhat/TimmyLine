import type { RequestHandler } from './$types';
import type { NewEventEntity } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	
	const eventEntityData: NewEventEntity = {
		event_id: body.event_uuid,
		entity_id: body.entity_uuid,
		role: body.role || null,
		context: body.context || null
	};

	if (!eventEntityData.event_id || !eventEntityData.entity_id) {
		throw error(400, 'Missing required fields: event_uuid and entity_uuid');
	}

	try {
		const [createdRelation] = await db
			.insert(schema.event_entities)
			.values(eventEntityData)
			.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		if (body.incident_id) {
			io.to(`incident:${body.incident_id}`).emit('entity-created', 'event_entities', createdRelation);
		}

		return json(createdRelation);

	} catch (err) {
		throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};
