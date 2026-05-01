import { db } from '$lib/server';
import { analysts } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import {
	ServiceError,
	requireAdminServiceAccess,
	requireReadServiceAccess,
	requireWriteServiceAccess,
	validateRequired,
	validateEnum,
	stripUndefined,
	type ServiceContext
} from './types';

import type { NewAnalyst } from '$lib/server/database';
import type { ListAnalystsParams, CreateAnalystData, UpdateAnalystData, DeleteAnalystData } from '$lib/types/analysts';

const VALID_ROLES = ['reader', 'analyst', 'admin'] as const;

// ============================================================================
// List
// ============================================================================

export async function listAnalysts(params: ListAnalystsParams = {}, ctx: ServiceContext) {
	requireReadServiceAccess(ctx);

	if (params.include_deleted) {
		requireAdminServiceAccess(ctx);
	}

	const conditions: SQL[] = [];

	if (params.uuid) conditions.push(eq(analysts.uuid, params.uuid));
	if (params.username) conditions.push(eq(analysts.username, params.username));
	if (params.full_name) conditions.push(eq(analysts.full_name, params.full_name));
	if (params.role) conditions.push(eq(analysts.role, params.role as typeof analysts.role._.data));
	if (params.active !== undefined) conditions.push(eq(analysts.active, params.active));
	if (params.created_at) conditions.push(eq(analysts.created_at, params.created_at));
	if (params.updated_at) conditions.push(eq(analysts.updated_at, params.updated_at));

	if (!params.include_deleted) {
		conditions.push(isNull(analysts.deleted_at));
	}

	const query = db.select().from(analysts);
	const results = conditions.length > 0
		? await query.where(and(...conditions))
		: await query;

	return results;
}

// ============================================================================
// Create
// ============================================================================

export async function createAnalyst(
	data: CreateAnalystData,
	ctx: ServiceContext
) {
	requireWriteServiceAccess(ctx);

	validateRequired(data as unknown as Record<string, unknown>, ['username']);
	if (data.role) {
		validateEnum('role', data.role, VALID_ROLES);
	}

	const insert: NewAnalyst = {
		username: data.username,
		full_name: data.full_name ?? null,
		role: data.role as NewAnalyst['role'] ?? null,
		active: data.active ?? true
	};

	try {
		const [created] = await db.insert(analysts).values(insert).returning();

		try {
			const io = getSocketIO();
			io.emit('entity-created', 'analyst', created);
		} catch { /* Socket.IO not available */ }

		return created;
	} catch (err: unknown) {
		if (err instanceof Error && err.message?.includes('UNIQUE constraint')) {
			throw new ServiceError(409, 'DUPLICATE', 'An analyst with this username already exists');
		}
		throw err;
	}
}

// ============================================================================
// Update
// ============================================================================

export async function updateAnalyst(
	data: UpdateAnalystData,
	ctx: ServiceContext
) {
	requireWriteServiceAccess(ctx);
	return updateAnalystRecord(data);
}

export async function updateAnalystAsAdmin(
	data: UpdateAnalystData,
	ctx: ServiceContext
) {
	requireAdminServiceAccess(ctx);
	return updateAnalystRecord(data);
}

async function updateAnalystRecord(data: UpdateAnalystData) {

	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);
	if (data.role !== undefined) {
		validateEnum('role', data.role, VALID_ROLES);
	}

	const updates = stripUndefined({
		username: data.username,
		full_name: data.full_name,
		role: data.role as NewAnalyst['role'],
		active: data.active,
		updated_at: Math.floor(Date.now() / 1000)
	});

	try {
		const [updated] = await db
			.update(analysts)
			.set(updates)
			.where(eq(analysts.uuid, data.uuid))
			.returning();

		if (!updated) {
			throw new ServiceError(404, 'NOT_FOUND', `Analyst ${data.uuid} not found`);
		}

		try {
			const io = getSocketIO();
			io.emit('entity-updated', 'analyst', updated);
		} catch { /* Socket.IO not available */ }

		return updated;
	} catch (err: unknown) {
		if (err instanceof ServiceError) throw err;
		if (err instanceof Error && err.message?.includes('UNIQUE constraint')) {
			throw new ServiceError(409, 'DUPLICATE', 'An analyst with this username already exists');
		}
		throw err;
	}
}

// ============================================================================
// Delete (soft)
// ============================================================================

export async function deleteAnalyst(
	data: DeleteAnalystData,
	ctx: ServiceContext
) {
	requireWriteServiceAccess(ctx);

	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);

	const [deleted] = await db
		.update(analysts)
		.set({ deleted_at: Math.floor(Date.now() / 1000) })
		.where(eq(analysts.uuid, data.uuid))
		.returning();

	if (!deleted) {
		throw new ServiceError(404, 'NOT_FOUND', `Analyst ${data.uuid} not found`);
	}

	try {
		const io = getSocketIO();
		io.emit('entity-deleted', 'analyst', data.uuid);
	} catch { /* Socket.IO not available */ }

	return deleted;
}
