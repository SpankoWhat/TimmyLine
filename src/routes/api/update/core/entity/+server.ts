import type { RequestHandler } from './$types';
import type { NewEntity } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	if (body.status && !['active', 'inactive', 'unknown'].includes(body.status)) {
		throw error(400, `Invalid status value: ${body.status}`);
	}

	if (body.criticality && !['critical', 'high', 'medium', 'low', 'unknown'].includes(body.criticality)) {
		throw error(400, `Invalid criticality value: ${body.criticality}`);
	}

	const entityData: Partial<NewEntity> = {
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

	try {
		const [updatedEntity] = await db
		.update(schema.entities)
		.set(entityData)
		.where(eq(schema.entities.uuid, body.uuid))
		.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('entity-updated', 'entity', updatedEntity);

		return json(updatedEntity);
	} catch (err) {
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
};