import type { RequestHandler } from './$types';
import type { NewAnalyst } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	
	const analystData: NewAnalyst = {
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
		.insert(schema.analysts)
		.values(analystData)
		.returning();

		const io = getSocketIO();
		io.to(`incident:all`).emit('core-entry-modified')

	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            throw error(409, 'An analyst with this username already exists');
        }
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
 
	return json(true);
};