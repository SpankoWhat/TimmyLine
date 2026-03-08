import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireReadAccess, requireWriteAccess, requireAdminAccess, buildServiceContext } from '$lib/server/auth/authorization';
import { listIncidents, updateIncident, deleteIncident, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { uuid } = event.params;

	try {
		const results = await listIncidents({ uuid });
		if (results.length === 0) {
			return json({ error: 'Incident not found' }, { status: 404 });
		}
		return json(results[0]);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async (event) => {
	await requireWriteAccess(event);
	const { uuid } = event.params;

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		const result = await updateIncident({ ...body, uuid }, ctx);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};

export const DELETE: RequestHandler = async (event) => {
	await requireAdminAccess(event);
	const { uuid } = event.params;
	const ctx = buildServiceContext(event);

	try {
		await deleteIncident({ uuid }, ctx);
		return json({ success: true });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
