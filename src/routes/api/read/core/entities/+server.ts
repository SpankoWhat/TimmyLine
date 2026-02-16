import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { entities } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { requireReadAccess } from '$lib/server/auth/authorization';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

	const conditions: SQL[] = [];

	// Get all query parameters and build WHERE conditions
	const uuid = url.searchParams.get('uuid');
	const incident_id = url.searchParams.get('incident_id');
	const entered_by = url.searchParams.get('entered_by');
	const entity_type = url.searchParams.get('entity_type');
	const created_at = url.searchParams.get('created_at');
	const updated_at = url.searchParams.get('updated_at');
	const first_seen = url.searchParams.get('first_seen');
	const last_seen = url.searchParams.get('last_seen');
	const identifier = url.searchParams.get('identifier');
	const display_name = url.searchParams.get('display_name');
	const attributes = url.searchParams.get('attributes');
	const status = url.searchParams.get('status');
	const criticality = url.searchParams.get('criticality');
	const tags = url.searchParams.get('tags');
	const include_deleted = url.searchParams.get('include_deleted');

	// Add conditions only if parameters are provided and not empty
	if (uuid) conditions.push(eq(entities.uuid, uuid));
	if (incident_id) conditions.push(eq(entities.incident_id, incident_id));
	if (entered_by) conditions.push(eq(entities.entered_by, entered_by));
	if (entity_type) conditions.push(eq(entities.entity_type, entity_type));
	if (created_at) conditions.push(eq(entities.created_at, parseInt(created_at)));
	if (updated_at) conditions.push(eq(entities.updated_at, parseInt(updated_at)));
	if (first_seen) conditions.push(eq(entities.first_seen, parseInt(first_seen)));
	if (last_seen) conditions.push(eq(entities.last_seen, parseInt(last_seen)));
	if (identifier) conditions.push(eq(entities.identifier, identifier));
	if (display_name) conditions.push(eq(entities.display_name, display_name));
	if (attributes) conditions.push(eq(entities.attributes, attributes));
	if (status) conditions.push(eq(entities.status, status as 'active' | 'inactive' | 'unknown'));
	if (criticality) conditions.push(eq(entities.criticality, criticality as 'critical' | 'high' | 'medium' | 'low' | 'unknown'));
	if (tags) conditions.push(eq(entities.tags, tags));

	// Filter out soft-deleted items unless explicitly requested
	if (include_deleted !== 'true') {
		conditions.push(isNull(entities.deleted_at));
	}

	// Execute query with combined conditions
	const results =
		conditions.length > 0
			? await db.select().from(entities).where(and(...conditions))
			: await db.select().from(entities);

	return json(results);
};
