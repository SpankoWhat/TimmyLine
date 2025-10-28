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
		action_events: schema.action_events,
		event_entities: schema.event_entities,
		action_entities: schema.action_entities,
		annotation_references: schema.annotation_references
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