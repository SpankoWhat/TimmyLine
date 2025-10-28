import type { RequestHandler } from './$types';
import type { NewIncident } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	
	const incidentData: NewIncident = {
		title: body.title,
		status: body.status,
		priority: body.priority,
		soar_ticket_id: body.soar_ticket_id
	};

	if (!incidentData) {
		throw error(400, 'Missing required incident data');
	}

	try {
		await db
		.insert(schema.incidents)
		.values(incidentData)
		.returning();
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            throw error(409, 'An incident with this SOAR ticket ID already exists');
        }
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
 
	return json(true);
};