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
	
	if (!body.event_id || !body.entity_id) {
		throw error(400, 'Missing required fields: event_id, entity_id');
	}

	const updateData = {
		role: body.role
	};

	try {
		const [updatedRelation] = await db
			.update(schema.event_entities)
			.set(updateData)
			.where(and(
				eq(schema.event_entities.event_id, body.event_id),
				eq(schema.event_entities.entity_id, body.entity_id)
			))
			.returning();

		// Broadcast to all connected clients
		const io = getSocketIO();
		io.emit('junction-updated', 'event_entities', updatedRelation);

		return json(updatedRelation);
	} catch (err) {
		throw error(500, `Database update error: ${(err as Error).message}`);
	}
};