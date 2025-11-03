import type { RequestHandler } from './$types';
import type { NewEntity } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	const entityData: Partial<NewEntity> = {
		incident_id: body.incident_id,
		entered_by: body.entered_by,
		entity_type: body.entity_type,
		identifier: body.identifier,
		status: body.status,
		first_seen: body.first_seen,
		last_seen: body.last_seen,
		display_name: body.display_name,
		attributes: body.attributes,
		criticality: body.criticality,
		tags: body.tags
	};

	if (!entityData) {
		throw error(400, 'Missing required entity data');
	}

	try {
		await db
		.update(schema.entities)
		.set(entityData)
		.where(eq(schema.entities.uuid, body.uuid))
		.returning();
	} catch (err) {
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
 
	return json(true);
};