import type { RequestHandler } from './$types';
import type { NewInvestigationAction } from '$lib/server/database';
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

	if (body.result && !['success', 'failed', 'partial', 'pending'].includes(body.result)) {
		throw error(400, `Invalid result value: ${body.result}`);
	}

	const investigationActionData: Partial<NewInvestigationAction> = {
		incident_id: body.incident_id,
		actioned_by: body.actioned_by,
		action_type: body.action_type,
		performed_at: body.performed_at,
		action_data: body.action_data,
		result: body.result,
		tool_used: body.tool_used,
		notes: body.notes,
		next_steps: body.next_steps,
		tags: body.tags
	};

	try {
		const [updatedAction] = await db
		.update(schema.investigation_actions)
		.set(investigationActionData)
		.where(eq(schema.investigation_actions.uuid, body.uuid))
		.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('entity-updated', 'investigation_action', updatedAction);

		return json(updatedAction);
	} catch (err) {
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
};