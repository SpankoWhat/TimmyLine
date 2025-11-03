import type { RequestHandler } from './$types';
import type { NewInvestigationAction } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
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

	if (!investigationActionData) {
		throw error(400, 'Missing required investigation action data');
	}

	try {
		await db
		.update(schema.investigation_actions)
		.set(investigationActionData)
		.where(eq(schema.investigation_actions.uuid, body.uuid))
		.returning();
	} catch (err) {
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
 
	return json(true);
};