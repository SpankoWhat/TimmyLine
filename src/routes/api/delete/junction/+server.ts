import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq, and } from 'drizzle-orm';
import { requireWriteAccess } from '$lib/server/auth/authorization';

export const POST: RequestHandler = async (event) => {
	await requireWriteAccess(event);
	const { request } = event;

	const { table, ...ids } = await request.json();

	if (!table) {
		throw error(400, 'Missing required field: "table"');
	}

	// Map valid table names to their schema
	const tableMap = {
		action_events: schema.action_events,
		event_entities: schema.event_entities,
		action_entities: schema.action_entities,
		annotation_references: schema.annotation_references
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
		// Build WHERE clause based on provided IDs
		// Junction tables typically have composite keys
		if (table === 'action_events') {
			if (!ids.action_id || !ids.event_id) {
				throw error(400, 'Missing required fields: "action_id" and "event_id"');
			}
			await db.delete(tableObj).where(
				and(
					eq(schema.action_events.action_id, ids.action_id),
					eq(schema.action_events.event_id, ids.event_id)
				)
			).returning();
		} else if (table === 'event_entities') {
			if (!ids.event_id || !ids.entity_id) {
				throw error(400, 'Missing required fields: "event_id" and "entity_id"');
			}
			await db.delete(tableObj).where(
				and(
					eq(schema.event_entities.event_id, ids.event_id),
					eq(schema.event_entities.entity_id, ids.entity_id)
				)
			).returning();
		} else if (table === 'action_entities') {
			if (!ids.action_id || !ids.entity_id) {
				throw error(400, 'Missing required fields: "action_id" and "entity_id"');
			}
			await db.delete(tableObj).where(
				and(
					eq(schema.action_entities.action_id, ids.action_id),
					eq(schema.action_entities.entity_id, ids.entity_id)
				)
			).returning();
		} else if (table === 'annotation_references') {
			if (!ids.annotation_id || !ids.reference_id || !ids.reference_type) {
				throw error(400, 'Missing required fields: "annotation_id", "reference_id", and "reference_type"');
			}
			await db.delete(tableObj).where(
				and(
					eq(schema.annotation_references.annotation_id, ids.annotation_id),
					eq(schema.annotation_references.reference_id, ids.reference_id),
					eq(schema.annotation_references.reference_type, ids.reference_type)
				)
			).returning();
		}
	} catch (err) {
		throw error(500, `Database deletion error: ${(err as Error).message}`);
	}

	return json(true);
};