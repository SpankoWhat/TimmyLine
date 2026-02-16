import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { annotations } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { requireReadAccess } from '$lib/server/auth/authorization';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

	const conditions: SQL[] = [];

	// Get all query parameters and build WHERE conditions
	const uuid = url.searchParams.get('uuid');
	const incident_id = url.searchParams.get('incident_id');
	const noted_by = url.searchParams.get('noted_by');
	const annotation_type = url.searchParams.get('annotation_type');
	const created_at = url.searchParams.get('created_at');
	const updated_at = url.searchParams.get('updated_at');
	const content = url.searchParams.get('content');
	const confidence = url.searchParams.get('confidence');
	const refers_to = url.searchParams.get('refers_to');
	const is_hypothesis = url.searchParams.get('is_hypothesis');
	const tags = url.searchParams.get('tags');
	const include_deleted = url.searchParams.get('include_deleted');

	// Add conditions only if parameters are provided and not empty
	if (uuid) conditions.push(eq(annotations.uuid, uuid));
	if (incident_id) conditions.push(eq(annotations.incident_id, incident_id));
	if (noted_by) conditions.push(eq(annotations.noted_by, noted_by));
	if (annotation_type) conditions.push(eq(annotations.annotation_type, annotation_type));
	if (created_at) conditions.push(eq(annotations.created_at, parseInt(created_at)));
	if (updated_at) conditions.push(eq(annotations.updated_at, parseInt(updated_at)));
	if (content) conditions.push(eq(annotations.content, content));
	if (confidence) conditions.push(eq(annotations.confidence, confidence as 'high' | 'medium' | 'low' | 'guess'));
	if (refers_to) conditions.push(eq(annotations.refers_to, refers_to));
	if (is_hypothesis) conditions.push(eq(annotations.is_hypothesis, is_hypothesis === 'true' || is_hypothesis === '1'));
	if (tags) conditions.push(eq(annotations.tags, tags));

	// Filter out soft-deleted items unless explicitly requested
	if (include_deleted !== 'true') {
		conditions.push(isNull(annotations.deleted_at));
	}

	// Execute query with combined conditions
	const results =
		conditions.length > 0
			? await db.select().from(annotations).where(and(...conditions))
			: await db.select().from(annotations);

	return json(results);
};
