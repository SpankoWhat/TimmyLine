import type { RequestHandler } from './$types';
import type { NewAnalyst } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	
	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	const analystData: Partial<NewAnalyst> = {
		username: body.username,
		full_name: body.full_name,
		role: body.role,
		active: body.active
	};

	if (!analystData) {
		throw error(400, `Missing required analyst data`);
	}

	try {
		await db
		.update(schema.analysts)
		.set(analystData)
		.where(eq(schema.analysts.uuid, body.uuid))
		.returning();

		const io = getSocketIO();
		io.to(`incident:all`).emit('core-entry-modified')

	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            throw error(409, 'An analyst with this username already exists');
        }
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
 
	return json(true);
};