/**
 * Incident Service
 *
 * All CRUD operations for the incidents table. This is the single source
 * of truth — API routes and MCP tool handlers both call into these functions.
 */

import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { incidents } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ServiceError, validateRequired, validateEnum, stripUndefined, type ServiceContext } from './types';

import type { NewIncident } from '$lib/server/database';

// ============================================================================
// Constants
// ============================================================================

const VALID_STATUSES = ['In Progress', 'Post-Mortem', 'Closed'] as const;
const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

// ============================================================================
// List
// ============================================================================

export interface ListIncidentsParams {
	uuid?: string;
	soar_ticket_id?: string;
	title?: string;
	status?: string;
	priority?: string;
	created_at?: number;
	updated_at?: number;
	include_deleted?: boolean;
}

export async function listIncidents(params: ListIncidentsParams = {}) {
	const conditions: SQL[] = [];

	if (params.uuid !== undefined) conditions.push(eq(incidents.uuid, params.uuid));
	if (params.soar_ticket_id !== undefined) conditions.push(eq(incidents.soar_ticket_id, params.soar_ticket_id));
	if (params.title !== undefined) conditions.push(eq(incidents.title, params.title));
	if (params.status !== undefined) conditions.push(eq(incidents.status, params.status as (typeof VALID_STATUSES)[number]));
	if (params.priority !== undefined) conditions.push(eq(incidents.priority, params.priority as (typeof VALID_PRIORITIES)[number]));
	if (params.created_at !== undefined) conditions.push(eq(incidents.created_at, params.created_at));
	if (params.updated_at !== undefined) conditions.push(eq(incidents.updated_at, params.updated_at));

	if (!params.include_deleted) {
		conditions.push(isNull(incidents.deleted_at));
	}

	try {
		const query = db.select().from(incidents);
		const results = conditions.length > 0
			? await query.where(and(...conditions))
			: await query;
		return results;
	} catch (err) {
		throw new ServiceError(500, 'DB_ERROR', `Failed to list incidents: ${(err as Error).message}`);
	}
}

// ============================================================================
// Create
// ============================================================================

export interface CreateIncidentData {
	title: string;
	status: string;
	priority: string;
	soar_ticket_id?: string;
}

export async function createIncident(data: CreateIncidentData, ctx: ServiceContext) {
	validateRequired(data as unknown as Record<string, unknown>, ['title', 'status', 'priority']);
	validateEnum('status', data.status, VALID_STATUSES);
	validateEnum('priority', data.priority, VALID_PRIORITIES);

	const incidentData: NewIncident = {
		title: data.title,
		status: data.status as (typeof VALID_STATUSES)[number],
		priority: data.priority as (typeof VALID_PRIORITIES)[number],
		soar_ticket_id: data.soar_ticket_id,
	};

	try {
		const [createdIncident] = await db
			.insert(schema.incidents)
			.values(incidentData)
			.returning();

		const io = getSocketIO();
		io.emit('entity-created', 'incident', createdIncident);

		return createdIncident;
	} catch (err) {
		const message = (err as Error).message ?? '';
		if (message.includes('UNIQUE constraint')) {
			throw new ServiceError(409, 'DUPLICATE', `Incident with duplicate unique field already exists`);
		}
		throw new ServiceError(500, 'DB_ERROR', `Failed to create incident: ${message}`);
	}
}

// ============================================================================
// Update
// ============================================================================

export interface UpdateIncidentData {
	uuid: string;
	title?: string;
	status?: string;
	priority?: string;
	soar_ticket_id?: string;
}

export async function updateIncident(data: UpdateIncidentData, ctx: ServiceContext) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);

	if (data.status !== undefined) validateEnum('status', data.status, VALID_STATUSES);
	if (data.priority !== undefined) validateEnum('priority', data.priority, VALID_PRIORITIES);

	const { uuid, status, priority, ...rest } = data;

	const updatePayload = stripUndefined({
		...rest,
		...(status !== undefined && { status: status as (typeof VALID_STATUSES)[number] }),
		...(priority !== undefined && { priority: priority as (typeof VALID_PRIORITIES)[number] }),
		updated_at: Math.floor(Date.now() / 1000),
	}) as Partial<NewIncident>;

	try {
		const [updatedIncident] = await db
			.update(schema.incidents)
			.set(updatePayload)
			.where(eq(incidents.uuid, uuid))
			.returning();

		if (!updatedIncident) {
			throw new ServiceError(404, 'NOT_FOUND', `Incident ${uuid} not found`);
		}

		const io = getSocketIO();
		io.emit('entity-updated', 'incident', updatedIncident);

		return updatedIncident;
	} catch (err) {
		if (err instanceof ServiceError) throw err;
		const message = (err as Error).message ?? '';
		if (message.includes('UNIQUE constraint')) {
			throw new ServiceError(409, 'DUPLICATE', `Incident update would violate unique constraint`);
		}
		throw new ServiceError(500, 'DB_ERROR', `Failed to update incident: ${message}`);
	}
}

// ============================================================================
// Delete (soft)
// ============================================================================

export interface DeleteIncidentData {
	uuid: string;
}

export async function deleteIncident(data: DeleteIncidentData, ctx: ServiceContext) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);

	const now = Math.floor(Date.now() / 1000);

	try {
		const [deleted] = await db
			.update(schema.incidents)
			.set({ deleted_at: now, updated_at: now })
			.where(eq(incidents.uuid, data.uuid))
			.returning();

		if (!deleted) {
			throw new ServiceError(404, 'NOT_FOUND', `Incident ${data.uuid} not found`);
		}

		const io = getSocketIO();
		io.emit('entity-deleted', 'incident', data.uuid);

		return true;
	} catch (err) {
		if (err instanceof ServiceError) throw err;
		throw new ServiceError(500, 'DB_ERROR', `Failed to delete incident: ${(err as Error).message}`);
	}
}
