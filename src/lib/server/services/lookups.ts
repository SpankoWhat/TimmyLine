import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq, isNull, isNotNull } from 'drizzle-orm';
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

export async function listLookups(params: { table: string; include_deleted?: boolean }) {
	validateRequired(params as Record<string, unknown>, ['table']);
	const tableObj = getTable(params.table);

	if (params.include_deleted) {
		return db.select().from(tableObj).all();
	}

	return db.select().from(tableObj).where(isNull(tableObj.deleted_at)).all();
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

	const allLookups = db.select().from(tableObj).where(isNull(tableObj.deleted_at)).all();

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

	const allLookups = db.select().from(tableObj).where(isNull(tableObj.deleted_at)).all();

	try {
		const io = getSocketIO();
		io.emit('lookup-updated', data.table, allLookups);
	} catch { /* Socket.IO not available */ }

	return { lookupData: allLookups };
}

// ============================================================================
// Soft Delete
// ============================================================================

export async function softDeleteLookup(
	data: { table: string; name: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['table', 'name']);
	const tableObj = getTable(data.table);

	const now = Math.floor(Date.now() / 1000);
	db.update(tableObj)
		.set({ deleted_at: now })
		.where(eq(tableObj.name, data.name))
		.run();

	const allLookups = db.select().from(tableObj).where(isNull(tableObj.deleted_at)).all();

	try {
		const io = getSocketIO();
		io.emit('lookup-updated', data.table, allLookups);
	} catch { /* Socket.IO not available */ }

	return { lookupData: allLookups };
}

// ============================================================================
// Restore (undo soft delete)
// ============================================================================

export async function restoreLookup(
	data: { table: string; name: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['table', 'name']);
	const tableObj = getTable(data.table);

	db.update(tableObj)
		.set({ deleted_at: null })
		.where(eq(tableObj.name, data.name))
		.run();

	const allLookups = db.select().from(tableObj).where(isNull(tableObj.deleted_at)).all();

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
