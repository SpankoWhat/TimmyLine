import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { and, eq } from 'drizzle-orm';
import { requireWriteAccess } from '$lib/server/auth/authorization';

export const POST: RequestHandler = async (event) => {
	await requireWriteAccess(event);
	const { request } = event;

	const body = await request.json();
	
	if (!body.action_id || !body.entity_id) {
		throw error(400, 'Missing required fields: action_id, entity_id');
	}

	const updateData = {
		relation_type: body.relation_type
	};

	try {
		const [updatedRelation] = await db
			.update(schema.action_entities)
			.set(updateData)
			.where(and(
				eq(schema.action_entities.action_id, body.action_id),
				eq(schema.action_entities.entity_id, body.entity_id)
			))
			.returning();

		// Broadcast to all connected clients
		const io = getSocketIO();
		io.emit('junction-updated', 'action_entities', updatedRelation);

		return json(updatedRelation);
	} catch (err) {
		throw error(500, `Database update error: ${(err as Error).message}`);
	}
};