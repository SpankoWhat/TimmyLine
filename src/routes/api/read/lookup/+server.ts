import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { listLookups, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

	const table = url.searchParams.get('table');
	if (!table) {
		return json({ error: 'Missing "table" query parameter' }, { status: 400 });
	}

	try {
		const results = await listLookups({ table });
		return json(results);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};