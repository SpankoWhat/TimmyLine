import type { RequestHandler } from './$types';
import type { NewIncident } from '$lib/server/database';
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

	if (body.status && !['In Progress', 'Post-Mortem', 'Closed'].includes(body.status)) {
		throw error(400, `Invalid status value: ${body.status}`);
	}

	if (body.priority && !['critical', 'high', 'medium', 'low'].includes(body.priority)) {
		throw error(400, `Invalid priority value: ${body.priority}`);
	}

	const incidentData: Partial<NewIncident> = {
		title: body.title,
		status: body.status,
		priority: body.priority,
		soar_ticket_id: body.soar_ticket_id
	};

	try {
		const [updatedIncident] = await db
		.update(schema.incidents)
		.set(incidentData)
		.where(eq(schema.incidents.uuid, body.uuid))
		.returning();

		// Broadcast to all connected clients
		const io = getSocketIO();
		io.emit('entity-updated', 'incident', updatedIncident);

		return json(updatedIncident);
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            throw error(409, 'An incident with this SOAR ticket ID already exists');
        }
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
};