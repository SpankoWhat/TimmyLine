import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { annotations } from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	try {
		await db
			.delete(annotations)
			.where(eq(annotations.uuid, body.uuid))
			.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		if (body.incident_id) {
			io.to(`incident:${body.incident_id}`).emit('entity-deleted', 'annotation', body.uuid);
		}

	} catch (err) {
		throw error(500, `Database deletion error: ${(err as Error).message}`);
	}

	return json(true);
};
