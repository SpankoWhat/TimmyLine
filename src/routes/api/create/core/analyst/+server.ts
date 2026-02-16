import type { RequestHandler } from './$types';
import type { NewAnalyst } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { requireWriteAccess } from '$lib/server/auth/authorization';

export const POST: RequestHandler = async (event) => {
	await requireWriteAccess(event);
	const { request } = event;

	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	// Validate required fields
	const requiredFields = { username: body.username };
	const missingFields = Object.entries(requiredFields)
		.filter(([_, value]) => value === undefined || value === null || value === '')
		.map(([key]) => key);

	if (missingFields.length > 0) {
		throw error(400, `Missing required fields: ${missingFields.join(', ')}`);
	}

	const analystData: NewAnalyst = {
		username: body.username,
		full_name: body.full_name,
		role: body.role,
		active: body.active
	};

	try {
		const [createdAnalyst] = await db
		.insert(schema.analysts)
		.values(analystData)
		.returning();

		// Broadcast to all connected clients (analysts are global)
		const io = getSocketIO();
		io.emit('entity-created', 'analyst', createdAnalyst);

		return json(createdAnalyst);
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            throw error(409, 'An analyst with this username already exists');
        }
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};