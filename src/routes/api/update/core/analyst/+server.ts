import type { RequestHandler } from './$types';
import type { NewAnalyst } from '$lib/server/database';
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

	if (body.role && !['analyst', 'on-point lead', 'observer'].includes(body.role)) {
		throw error(400, `Invalid role value: ${body.role}`);
	}

	const analystData: Partial<NewAnalyst> = {
		username: body.username,
		full_name: body.full_name,
		role: body.role,
		active: body.active,
		updated_at: Math.floor(Date.now() / 1000)
	};

	const cleanedData = Object.fromEntries(
		Object.entries(analystData).filter(([_, v]) => v !== undefined)
	);

	try {
		const [updatedAnalyst] = await db
		.update(schema.analysts)
		.set(cleanedData)
		.where(eq(schema.analysts.uuid, body.uuid))
		.returning();

		// Broadcast to all connected clients
		const io = getSocketIO();
		io.emit('entity-updated', 'analyst', updatedAnalyst);

		return json(updatedAnalyst);
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            throw error(409, 'An analyst with this username already exists');
        }
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
};