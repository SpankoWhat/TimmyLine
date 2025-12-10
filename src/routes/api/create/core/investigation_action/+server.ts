import type { RequestHandler } from './$types';
import type { NewInvestigationAction } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	const investigationActionData: NewInvestigationAction = {
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

	if (!investigationActionData) {
		throw error(400, 'Missing required investigation action data');
	}

	try {
		const [createdAction] = await db
		.insert(schema.investigation_actions)
		.values(investigationActionData)
		.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('entity-created', 'investigation_action', createdAction);

		return json(createdAction);
	} catch (err) {
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};