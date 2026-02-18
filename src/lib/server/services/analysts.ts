import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { analysts } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ServiceError, validateRequired, validateEnum, stripUndefined, type ServiceContext } from './types';

import type { NewAnalyst } from '$lib/server/database';

const VALID_ROLES = ['analyst', 'on-point lead', 'observer'] as const;

// ============================================================================
// List
// ============================================================================

export async function listAnalysts(params: {
	uuid?: string;
	username?: string;
	full_name?: string;
	role?: string;
	active?: boolean;
	created_at?: number;
	updated_at?: number;
	include_deleted?: boolean;
} = {}) {
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

	const results = db
		.select()
		.from(analysts)
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.all();

	return results;
}

// ============================================================================
// Create
// ============================================================================

export async function createAnalyst(
	data: { username: string; full_name?: string; role?: string; active?: boolean },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['username']);
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
		const created = db.insert(analysts).values(insert).returning().get();

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
	data: { uuid: string; username?: string; full_name?: string; role?: string; active?: boolean },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['uuid']);
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
		const updated = db
			.update(analysts)
			.set(updates)
			.where(eq(analysts.uuid, data.uuid))
			.returning()
			.get();

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
	data: { uuid: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['uuid']);

	const deleted = db
		.update(analysts)
		.set({ deleted_at: Math.floor(Date.now() / 1000) })
		.where(eq(analysts.uuid, data.uuid))
		.returning()
		.get();

	if (!deleted) {
		throw new ServiceError(404, 'NOT_FOUND', `Analyst ${data.uuid} not found`);
	}

	try {
		const io = getSocketIO();
		io.emit('entity-deleted', 'analyst', data.uuid);
	} catch { /* Socket.IO not available */ }

	return deleted;
}
