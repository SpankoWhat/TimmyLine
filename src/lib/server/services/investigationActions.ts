/**
 * Investigation Actions Service
 *
 * Single source of truth for investigation_actions CRUD operations,
 * validation, and Socket.IO broadcasting.
 */

import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ServiceError, validateRequired, validateEnum, stripUndefined, type ServiceContext } from './types';

import type { NewInvestigationAction } from '$lib/server/database';

const RESULT_VALUES = ['success', 'failed', 'partial', 'pending'] as const;

// ============================================================================
// List
// ============================================================================

export async function listInvestigationActions(params: {
	uuid?: string;
	action_type?: string;
	incident_id?: string;
	tags?: string;
	actioned_by?: string;
	performed_at?: number;
	action_data?: string;
	result?: string;
	tool_used?: string;
	notes?: string;
	next_steps?: string;
	include_deleted?: boolean;
}) {
	const conditions: SQL[] = [];

	if (params.uuid) conditions.push(eq(schema.investigation_actions.uuid, params.uuid));
	if (params.action_type) conditions.push(eq(schema.investigation_actions.action_type, params.action_type));
	if (params.incident_id) conditions.push(eq(schema.investigation_actions.incident_id, params.incident_id));
	if (params.tags) conditions.push(eq(schema.investigation_actions.tags, params.tags));
	if (params.actioned_by) conditions.push(eq(schema.investigation_actions.actioned_by, params.actioned_by));
	if (params.performed_at) conditions.push(eq(schema.investigation_actions.performed_at, params.performed_at));
	if (params.action_data) conditions.push(eq(schema.investigation_actions.action_data, params.action_data));
	if (params.result) conditions.push(eq(schema.investigation_actions.result, params.result as 'success' | 'failed' | 'partial' | 'pending'));
	if (params.tool_used) conditions.push(eq(schema.investigation_actions.tool_used, params.tool_used));
	if (params.notes) conditions.push(eq(schema.investigation_actions.notes, params.notes));
	if (params.next_steps) conditions.push(eq(schema.investigation_actions.next_steps, params.next_steps));

	// Filter out soft-deleted items unless explicitly requested
	if (!params.include_deleted) {
		conditions.push(isNull(schema.investigation_actions.deleted_at));
	}

	return conditions.length > 0
		? await db.select().from(schema.investigation_actions).where(and(...conditions))
		: await db.select().from(schema.investigation_actions);
}

// ============================================================================
// Create
// ============================================================================

export async function createInvestigationAction(
	data: {
		incident_id: string;
		actioned_by: string;
		action_type: string;
		performed_at: number;
		action_data?: string;
		result?: string;
		tool_used?: string;
		notes?: string;
		next_steps?: string;
		tags?: string;
	},
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, [
		'incident_id',
		'actioned_by',
		'action_type',
		'performed_at'
	]);

	validateEnum('result', data.result, RESULT_VALUES);

	const actionData: NewInvestigationAction = {
		incident_id: data.incident_id,
		actioned_by: data.actioned_by,
		action_type: data.action_type,
		performed_at: data.performed_at,
		action_data: data.action_data,
		result: data.result as NewInvestigationAction['result'],
		tool_used: data.tool_used,
		notes: data.notes,
		next_steps: data.next_steps,
		tags: data.tags
	};

	try {
		const [created] = await db
			.insert(schema.investigation_actions)
			.values(actionData)
			.returning();

		const io = getSocketIO();
		io.to(`incident:${data.incident_id}`).emit('entity-created', 'investigation_action', created);

		return created;
	} catch (err) {
		throw new ServiceError(500, 'DB_INSERT_ERROR', `Database insertion error: ${(err as Error).message}`);
	}
}

// ============================================================================
// Update
// ============================================================================

export async function updateInvestigationAction(
	data: {
		uuid: string;
		incident_id?: string;
		actioned_by?: string;
		action_type?: string;
		performed_at?: number;
		action_data?: string;
		result?: string;
		tool_used?: string;
		notes?: string;
		next_steps?: string;
		tags?: string;
	},
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);
	validateEnum('result', data.result, RESULT_VALUES);

	const { uuid, ...fields } = data;

	const cleanedData = stripUndefined({
		...fields,
		result: data.result as NewInvestigationAction['result'],
		updated_at: Math.floor(Date.now() / 1000)
	});

	try {
		const [updated] = await db
			.update(schema.investigation_actions)
			.set(cleanedData)
			.where(eq(schema.investigation_actions.uuid, uuid))
			.returning();

		if (!updated) {
			throw new ServiceError(404, 'NOT_FOUND', `Investigation action ${uuid} not found`);
		}

		const io = getSocketIO();
		io.to(`incident:${data.incident_id}`).emit('entity-updated', 'investigation_action', updated);

		return updated;
	} catch (err) {
		if (err instanceof ServiceError) throw err;
		throw new ServiceError(500, 'DB_UPDATE_ERROR', `Database update error: ${(err as Error).message}`);
	}
}

// ============================================================================
// Delete (soft)
// ============================================================================

export async function deleteInvestigationAction(
	data: { uuid: string; incident_id?: string },
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);

	try {
		await db
			.update(schema.investigation_actions)
			.set({
				deleted_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000)
			})
			.where(eq(schema.investigation_actions.uuid, data.uuid))
			.returning();

		const io = getSocketIO();
		if (data.incident_id) {
			io.to(`incident:${data.incident_id}`).emit('entity-deleted', 'investigation_action', data.uuid);
		}

		return true;
	} catch (err) {
		throw new ServiceError(500, 'DB_DELETE_ERROR', `Database deletion error: ${(err as Error).message}`);
	}
}
