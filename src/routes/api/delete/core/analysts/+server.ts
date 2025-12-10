import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { analysts } from '$lib/server/database';
import { eq } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	try {
		await db
			.delete(analysts)
			.where(eq(analysts.uuid, body.uuid))
			.returning();

		// Broadcast to all connected clients
		const io = getSocketIO();
		io.emit('entity-deleted', 'analyst', body.uuid);

	} catch (err) {
		throw error(500, `Database deletion error: ${(err as Error).message}`);
	}

	return json(true);
};
