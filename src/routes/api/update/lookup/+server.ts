import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { getSocketIO } from '$lib/server/socket';
import * as schema from '$lib/server/database';
import { eq } from 'drizzle-orm';
import { requireWriteAccess } from '$lib/server/auth/authorization';

// Should be using the type lookup tables: event_type, action_type, relation_type, annotation_type, entity_type instead of this
// But for now this works...
export const POST: RequestHandler = async (event) => {
	await requireWriteAccess(event);
	const { request } = event;

	const { table, name, description, old_name } = await request.json();
	
	if (!table || !name || !description) {
	throw error(400, 'Missing required query parameters: "table", "name", "description"');
	}

	if (!old_name) {
		throw error(400, 'Missing required field: "old_name" (the original name/primary key to update)');
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
		await db.update(tableObj).set({
			name,
			description
		}).where(eq(tableObj.name, old_name)).returning();

		// Fetch updated lookup table
		const allLookups = await db.select().from(tableObj);

		// Broadcast to all connected clients
		const io = getSocketIO();
		io.emit('lookup-updated', table, allLookups);

		return json({ lookupData: allLookups });
	} catch (err) {
		throw error(500, `Database update error: ${(err as Error).message}`);
	}
};