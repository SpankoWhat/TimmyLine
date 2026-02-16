import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { analysts } from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { requireReadAccess } from '$lib/server/auth/authorization';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

	const conditions: SQL[] = [];

	// Get all query parameters and build WHERE conditions
	const uuid = url.searchParams.get('uuid');
	const username = url.searchParams.get('username');
	const full_name = url.searchParams.get('full_name');
	const role = url.searchParams.get('role');
	const active = url.searchParams.get('active');
	const created_at = url.searchParams.get('created_at');
	const updated_at = url.searchParams.get('updated_at');
	const include_deleted = url.searchParams.get('include_deleted');

	// Add conditions only if parameters are provided and not empty
	if (uuid) conditions.push(eq(analysts.uuid, uuid));
	if (username) conditions.push(eq(analysts.username, username));
	if (full_name) conditions.push(eq(analysts.full_name, full_name));
	if (role) conditions.push(eq(analysts.role, role as 'analyst' | 'on-point lead' | 'observer'));
	if (active) conditions.push(eq(analysts.active, active === 'true' || active === '1'));
	if (created_at) conditions.push(eq(analysts.created_at, parseInt(created_at)));
	if (updated_at) conditions.push(eq(analysts.updated_at, parseInt(updated_at)));

	// Filter out soft-deleted items unless explicitly requested
	if (include_deleted !== 'true') {
		conditions.push(isNull(analysts.deleted_at));
	}

	// Execute query with combined conditions
	const results =
		conditions.length > 0
			? await db.select().from(analysts).where(and(...conditions))
			: await db.select().from(analysts);

	return json(results);
};
