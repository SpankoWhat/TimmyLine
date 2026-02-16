import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { incidents } from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';
import { requireAdminAccess } from '$lib/server/auth/authorization';

export const POST: RequestHandler = async (event) => {
	await requireAdminAccess(event);
	const { request } = event;

	const body = await request.json();

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	try {
		await db
			.update(incidents)
			.set({
				deleted_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000)
			})
			.where(eq(incidents.uuid, body.uuid))
			.returning();

		// Broadcast to all connected clients
		const io = getSocketIO();
		io.emit('entity-deleted', 'incident', body.uuid);

	} catch (err) {
		throw error(500, `Database deletion error: ${(err as Error).message}`);
	}

	return json(true);
};
