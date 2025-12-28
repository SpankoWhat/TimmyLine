import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { investigation_actions } from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	try {
		await db
			.update(investigation_actions)
			.set({
				deleted_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000)
			})
			.where(eq(investigation_actions.uuid, body.uuid))
			.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		if (body.incident_id) {
			io.to(`incident:${body.incident_id}`).emit('entity-deleted', 'investigation_action', body.uuid);
		}

	} catch (err) {
		throw error(500, `Database deletion error: ${(err as Error).message}`);
	}

	return json(true);
};