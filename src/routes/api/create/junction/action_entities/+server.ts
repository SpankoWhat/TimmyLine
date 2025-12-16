import type { RequestHandler } from './$types';
import type { NewActionEntity } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { socketLogger as logger } from '$lib/server/logging';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	
	const actionEntityData: NewActionEntity = {
		action_id: body.action_uuid,
		entity_id: body.entity_uuid,
		relation_type: body.relation_type
	};

	if (!actionEntityData.action_id || !actionEntityData.entity_id || !actionEntityData.relation_type) {
		throw error(400, 'Missing required fields: action_uuid, entity_uuid, and relation_type');
	}

	try {
		const [createdRelation] = await db
			.insert(schema.action_entities)
			.values(actionEntityData)
			.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		if (!body.incident_id) {
			logger.error('Missing incident_id in request body for broadcasting entity-created event');
			throw error(400, 'Missing required field: incident_id');
		}

		io.to(`incident:${body.incident_id}`).emit('entity-created', 'action_entities', createdRelation);

		return json(createdRelation);

	} catch (err) {
		throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};
