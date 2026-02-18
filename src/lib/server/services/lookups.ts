import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ServiceError, validateRequired, type ServiceContext, type LookupTableName } from './types';

// ============================================================================
// Table Map
// ============================================================================

const tableMap = {
	event_type: schema.event_type,
	action_type: schema.action_type,
	relation_type: schema.relation_type,
	annotation_type: schema.annotation_type,
	entity_type: schema.entity_type
} as const;

// ============================================================================
// Helpers
// ============================================================================

function getTable(name: string) {
	if (!(name in tableMap)) {
		throw new ServiceError(400, 'INVALID_TABLE', `Invalid lookup table: ${name}. Must be one of: ${Object.keys(tableMap).join(', ')}`);
	}
	return tableMap[name as LookupTableName];
}

// ============================================================================
// List
// ============================================================================

export async function listLookups(params: { table: string }) {
	validateRequired(params as Record<string, unknown>, ['table']);
	const tableObj = getTable(params.table);

	const results = db.select().from(tableObj).all();
	return results;
}

// ============================================================================
// Create
// ============================================================================

export async function createLookup(
	data: { table: string; name: string; description: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['table', 'name', 'description']);
	const tableObj = getTable(data.table);

	try {
		db.insert(tableObj).values({ name: data.name, description: data.description }).run();
	} catch (err: unknown) {
		if (err instanceof Error && err.message?.includes('UNIQUE constraint')) {
			throw new ServiceError(409, 'DUPLICATE', `A ${data.table} with this name already exists`);
		}
		throw err;
	}

	const allLookups = db.select().from(tableObj).all();

	try {
		const io = getSocketIO();
		io.emit('lookup-updated', data.table, allLookups);
	} catch { /* Socket.IO not available */ }

	return { lookupData: allLookups };
}

// ============================================================================
// Update
// ============================================================================

export async function updateLookup(
	data: { table: string; old_name: string; name: string; description: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['table', 'name', 'description', 'old_name']);
	const tableObj = getTable(data.table);

	try {
		db.update(tableObj)
			.set({ name: data.name, description: data.description })
			.where(eq(tableObj.name, data.old_name))
			.run();
	} catch (err: unknown) {
		if (err instanceof Error && err.message?.includes('UNIQUE constraint')) {
			throw new ServiceError(409, 'DUPLICATE', `A ${data.table} with this name already exists`);
		}
		throw err;
	}

	const allLookups = db.select().from(tableObj).all();

	try {
		const io = getSocketIO();
		io.emit('lookup-updated', data.table, allLookups);
	} catch { /* Socket.IO not available */ }

	return { lookupData: allLookups };
}

// ============================================================================
// Delete (hard)
// ============================================================================

export async function deleteLookup(
	data: { table: string; name: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['table', 'name']);
	const tableObj = getTable(data.table);

	db.delete(tableObj).where(eq(tableObj.name, data.name)).run();

	return true;
}
