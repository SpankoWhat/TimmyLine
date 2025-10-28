import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { incidents } from '$lib/server/database';
import { eq, and, type SQL } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const conditions: SQL[] = [];

	// Get all query parameters and build WHERE conditions
	const uuid = url.searchParams.get('uuid');
	const soar_ticket_id = url.searchParams.get('soar_ticket_id');
	const title = url.searchParams.get('title');
	const status = url.searchParams.get('status');
	const priority = url.searchParams.get('priority');
	const created_at = url.searchParams.get('created_at');
	const updated_at = url.searchParams.get('updated_at');

	// Add conditions only if parameters are provided and not empty
	if (uuid) conditions.push(eq(incidents.uuid, uuid));
	if (soar_ticket_id) conditions.push(eq(incidents.soar_ticket_id, soar_ticket_id));
	if (title) conditions.push(eq(incidents.title, title));
	if (status) conditions.push(eq(incidents.status, status as 'In Progress' | 'Post-Mortem' | 'Closed'));
	if (priority) conditions.push(eq(incidents.priority, priority as 'critical' | 'high' | 'medium' | 'low'));
	if (created_at) conditions.push(eq(incidents.created_at, parseInt(created_at)));
	if (updated_at) conditions.push(eq(incidents.updated_at, parseInt(updated_at)));

	// Execute query with combined conditions
	const results =
		conditions.length > 0
			? await db.select().from(incidents).where(and(...conditions))
			: await db.select().from(incidents);

	return json(results);
};
