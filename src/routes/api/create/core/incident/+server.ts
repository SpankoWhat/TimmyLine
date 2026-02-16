import type { RequestHandler } from './$types';
import type { NewIncident } from '$lib/server/database';
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
	const requiredFields = { title: body.title, status: body.status, priority: body.priority };
	const missingFields = Object.entries(requiredFields)
		.filter(([_, value]) => value === undefined || value === null || value === '')
		.map(([key]) => key);

	if (missingFields.length > 0) {
		throw error(400, `Missing required fields: ${missingFields.join(', ')}`);
	}

	// Validate enum values
	const validStatuses = ['In Progress', 'Post-Mortem', 'Closed'] as const;
	if (!validStatuses.includes(body.status)) {
		throw error(400, `Invalid status: must be one of ${validStatuses.join(', ')}`);
	}

	const validPriorities = ['critical', 'high', 'medium', 'low'] as const;
	if (!validPriorities.includes(body.priority)) {
		throw error(400, `Invalid priority: must be one of ${validPriorities.join(', ')}`);
	}

	const incidentData: NewIncident = {
		title: body.title,
		status: body.status,
		priority: body.priority,
		soar_ticket_id: body.soar_ticket_id
	};

	try {
		const [createdIncident] = await db
		.insert(schema.incidents)
		.values(incidentData)
		.returning();

		// Broadcast to all connected clients (incidents are global)
		const io = getSocketIO();
		io.emit('entity-created', 'incident', createdIncident);

		return json(createdIncident);
	} catch (err) {
		if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
            throw error(409, 'An incident with this SOAR ticket ID already exists');
        }
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};