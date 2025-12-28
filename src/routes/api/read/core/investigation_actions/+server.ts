import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { investigation_actions } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const conditions: SQL[] = [];
	// Get all query parameters and build WHERE conditions
	const uuid = url.searchParams.get('uuid');
	const action_type = url.searchParams.get('action_type');
	const incident_id = url.searchParams.get('incident_id');
	const tags = url.searchParams.get('tags');
	const actioned_by = url.searchParams.get('actioned_by');
	const performed_at = url.searchParams.get('performed_at');
	const action_data = url.searchParams.get('action_data');
	const result = url.searchParams.get('result');
	const tool_used = url.searchParams.get('tool_used');
	const notes = url.searchParams.get('notes');
	const next_steps = url.searchParams.get('next_steps');
	const include_deleted = url.searchParams.get('include_deleted');


	// Add conditions only if parameters are provided and not empty
	if (uuid) conditions.push(eq(investigation_actions.uuid, uuid));
	if (action_type) conditions.push(eq(investigation_actions.action_type, action_type));
	if (incident_id) conditions.push(eq(investigation_actions.incident_id, incident_id));
	if (tags) conditions.push(eq(investigation_actions.tags, tags));
	if (actioned_by) conditions.push(eq(investigation_actions.actioned_by, actioned_by));
	if (performed_at) conditions.push(eq(investigation_actions.performed_at, parseInt(performed_at)));
	if (action_data) conditions.push(eq(investigation_actions.action_data, action_data));
	if (result) conditions.push(eq(investigation_actions.result, result as 'success' | 'failed' | 'partial' | 'pending'));
	if (tool_used) conditions.push(eq(investigation_actions.tool_used, tool_used));
	if (notes) conditions.push(eq(investigation_actions.notes, notes));
	if (next_steps) conditions.push(eq(investigation_actions.next_steps, next_steps));

	// Filter out soft-deleted items unless explicitly requested
	if (include_deleted !== 'true') {
		conditions.push(isNull(investigation_actions.deleted_at));
	}

	// Execute query with combined conditions
	const results =
		conditions.length > 0
			? await db.select().from(investigation_actions).where(and(...conditions))
			: await db.select().from(investigation_actions);

	return json(results);
};