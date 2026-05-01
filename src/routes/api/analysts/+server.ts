import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import { listAnalysts, createAnalyst, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const ctx = buildServiceContext(event);

	try {
		const results = await listAnalysts({
			uuid: url.searchParams.get('uuid') || undefined,
			username: url.searchParams.get('username') || undefined,
			full_name: url.searchParams.get('full_name') || undefined,
			role: url.searchParams.get('role') || undefined,
			active: url.searchParams.get('active') ? (url.searchParams.get('active') === 'true' || url.searchParams.get('active') === '1') : undefined,
			created_at: url.searchParams.get('created_at') ? parseInt(url.searchParams.get('created_at')!) : undefined,
			updated_at: url.searchParams.get('updated_at') ? parseInt(url.searchParams.get('updated_at')!) : undefined,
			include_deleted: url.searchParams.get('include_deleted') === 'true'
		}, ctx);
		return json(results);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		const result = await createAnalyst(body, ctx);
		return json(result, { status: 201 });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
