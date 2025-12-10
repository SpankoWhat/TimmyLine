import type { RequestHandler } from './$types';
import type { NewEntity } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	const entityData: NewEntity = {
		incident_id: body.incident_id,
		entered_by: body.entered_by,
		entity_type: body.entity_type,
		identifier: body.identifier,
		status: body.status,
		first_seen: body.first_seen,
		last_seen: body.last_seen,
		display_name: body.display_name,
		attributes: body.attributes,
		criticality: body.criticality,
		tags: body.tags
	};

	if (!entityData) {
		throw error(400, 'Missing required entity data');
	}

	try {
		const [createdEntity] = await db
		.insert(schema.entities)
		.values(entityData)
		.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('entity-created', 'entity', createdEntity);

		return json(createdEntity);
	} catch (err) {
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};