import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';

export const GET: RequestHandler = async ({ url }) => {
	const userTableInput = url.searchParams.get('table');

	if (!userTableInput) {
		throw error(400, 'Missing "table" query parameter');
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

	if (!(userTableInput in tableMap)) {
		throw error(
			400,
			`Invalid table name. Must be one of: ${Object.keys(tableMap).join(', ')}`
		);
	}

	const table = tableMap[userTableInput as TableName];
	const results = await db.select().from(table)

	return json(results);
};