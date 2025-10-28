import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';

// Should be using the type lookup tables: event_type, action_type, relation_type, annotation_type, entity_type instead of this
// But for now this works...
export const POST: RequestHandler = async ({ request }) => {
	const { table, name, description } = await request.json();
	
	if (!table || !name || !description) {
	throw error(400, 'Missing required query parameters: "table", "name", "description"');
	}

	// Map valid table names to their schema
	const tableMap = {
		event_type: schema.event_type,
		action_type: schema.action_type,
		relation_type: schema.relation_type,
		annotation_type: schema.annotation_type,
		entity_type: schema.entity_type
	} as const;

	type TableName = keyof typeof tableMap;

	if (!(table in tableMap)) {
		throw error(
			400,
			`Invalid table name. Must be one of: ${Object.keys(tableMap).join(', ')}`
		);
	}

	const tableObj = tableMap[table as TableName];

	try {
		await db.insert(tableObj).values({
			name,
			description
		}).returning();
	} catch (err) {
		throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
 
	return json(true);
};