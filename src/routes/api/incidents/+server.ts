import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireReadAccess, requireWriteAccess, buildServiceContext } from '$lib/server/auth/authorization';
import { listIncidents, createIncident, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

	try {
		const results = await listIncidents({
			uuid: url.searchParams.get('uuid') || undefined,
			soar_ticket_id: url.searchParams.get('soar_ticket_id') || undefined,
			title: url.searchParams.get('title') || undefined,
			status: url.searchParams.get('status') || undefined,
			priority: url.searchParams.get('priority') || undefined,
			created_at: url.searchParams.get('created_at') ? parseInt(url.searchParams.get('created_at')!) : undefined,
			updated_at: url.searchParams.get('updated_at') ? parseInt(url.searchParams.get('updated_at')!) : undefined,
			include_deleted: url.searchParams.get('include_deleted') === 'true'
		});
		return json(results);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	await requireWriteAccess(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		const result = await createIncident(body, ctx);
		return json(result, { status: 201 });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
