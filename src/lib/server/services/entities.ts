/**
 * Entities Service
 *
 * Single source of truth for entities CRUD operations,
 * validation, and Socket.IO broadcasting.
 */

import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ServiceError, validateRequired, validateEnum, stripUndefined, type ServiceContext } from './types';

import type { NewEntity } from '$lib/server/database';

const STATUS_VALUES = ['active', 'inactive', 'unknown'] as const;
const CRITICALITY_VALUES = ['critical', 'high', 'medium', 'low', 'unknown'] as const;

// ============================================================================
// List
// ============================================================================

export async function listEntities(params: {
	uuid?: string;
	incident_id?: string;
	entered_by?: string;
	entity_type?: string;
	created_at?: number;
	updated_at?: number;
	first_seen?: number;
	last_seen?: number;
	identifier?: string;
	display_name?: string;
	attributes?: string;
	status?: string;
	criticality?: string;
	tags?: string;
	include_deleted?: boolean;
}) {
	const conditions: SQL[] = [];

	if (params.uuid) conditions.push(eq(schema.entities.uuid, params.uuid));
	if (params.incident_id) conditions.push(eq(schema.entities.incident_id, params.incident_id));
	if (params.entered_by) conditions.push(eq(schema.entities.entered_by, params.entered_by));
	if (params.entity_type) conditions.push(eq(schema.entities.entity_type, params.entity_type));
	if (params.created_at) conditions.push(eq(schema.entities.created_at, params.created_at));
	if (params.updated_at) conditions.push(eq(schema.entities.updated_at, params.updated_at));
	if (params.first_seen) conditions.push(eq(schema.entities.first_seen, params.first_seen));
	if (params.last_seen) conditions.push(eq(schema.entities.last_seen, params.last_seen));
	if (params.identifier) conditions.push(eq(schema.entities.identifier, params.identifier));
	if (params.display_name) conditions.push(eq(schema.entities.display_name, params.display_name));
	if (params.attributes) conditions.push(eq(schema.entities.attributes, params.attributes));
	if (params.status) conditions.push(eq(schema.entities.status, params.status as 'active' | 'inactive' | 'unknown'));
	if (params.criticality) conditions.push(eq(schema.entities.criticality, params.criticality as 'critical' | 'high' | 'medium' | 'low' | 'unknown'));
	if (params.tags) conditions.push(eq(schema.entities.tags, params.tags));

	// Filter out soft-deleted items unless explicitly requested
	if (!params.include_deleted) {
		conditions.push(isNull(schema.entities.deleted_at));
	}

	return conditions.length > 0
		? await db.select().from(schema.entities).where(and(...conditions))
		: await db.select().from(schema.entities);
}

// ============================================================================
// Create
// ============================================================================

export async function createEntity(
	data: {
		incident_id: string;
		entered_by: string;
		entity_type: string;
		identifier: string;
		display_name?: string;
		status?: string;
		criticality?: string;
		first_seen?: number;
		last_seen?: number;
		attributes?: string;
		tags?: string;
	},
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, [
		'incident_id',
		'entered_by',
		'entity_type',
		'identifier'
	]);

	validateEnum('status', data.status, STATUS_VALUES);
	validateEnum('criticality', data.criticality, CRITICALITY_VALUES);

	const entityData: NewEntity = {
		incident_id: data.incident_id,
		entered_by: data.entered_by,
		entity_type: data.entity_type,
		identifier: data.identifier,
		display_name: data.display_name,
		status: data.status as NewEntity['status'],
		criticality: data.criticality as NewEntity['criticality'],
		first_seen: data.first_seen,
		last_seen: data.last_seen,
		attributes: data.attributes,
		tags: data.tags
	};

	try {
		const [created] = await db
			.insert(schema.entities)
			.values(entityData)
			.returning();

		const io = getSocketIO();
		io.to(`incident:${data.incident_id}`).emit('entity-created', 'entity', created);

		return created;
	} catch (err) {
		throw new ServiceError(500, 'DB_INSERT_ERROR', `Database insertion error: ${(err as Error).message}`);
	}
}

// ============================================================================
// Update
// ============================================================================

export async function updateEntity(
	data: {
		uuid: string;
		incident_id?: string;
		entered_by?: string;
		entity_type?: string;
		identifier?: string;
		display_name?: string;
		status?: string;
		criticality?: string;
		first_seen?: number;
		last_seen?: number;
		attributes?: string;
		tags?: string;
	},
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);
	validateEnum('status', data.status, STATUS_VALUES);
	validateEnum('criticality', data.criticality, CRITICALITY_VALUES);

	const { uuid, ...fields } = data;

	const cleanedData = stripUndefined({
		...fields,
		status: data.status as NewEntity['status'],
		criticality: data.criticality as NewEntity['criticality'],
		updated_at: Math.floor(Date.now() / 1000)
	});

	try {
		const [updated] = await db
			.update(schema.entities)
			.set(cleanedData)
			.where(eq(schema.entities.uuid, uuid))
			.returning();

		if (!updated) {
			throw new ServiceError(404, 'NOT_FOUND', `Entity ${uuid} not found`);
		}

		const io = getSocketIO();
		io.to(`incident:${data.incident_id}`).emit('entity-updated', 'entity', updated);

		return updated;
	} catch (err) {
		if (err instanceof ServiceError) throw err;
		throw new ServiceError(500, 'DB_UPDATE_ERROR', `Database update error: ${(err as Error).message}`);
	}
}

// ============================================================================
// Delete (soft)
// ============================================================================

export async function deleteEntity(
	data: { uuid: string; incident_id?: string },
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);

	try {
		await db
			.update(schema.entities)
			.set({
				deleted_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000)
			})
			.where(eq(schema.entities.uuid, data.uuid))
			.returning();

		const io = getSocketIO();
		if (data.incident_id) {
			io.to(`incident:${data.incident_id}`).emit('entity-deleted', 'entity', data.uuid);
		}

		return true;
	} catch (err) {
		throw new ServiceError(500, 'DB_DELETE_ERROR', `Database deletion error: ${(err as Error).message}`);
	}
}
