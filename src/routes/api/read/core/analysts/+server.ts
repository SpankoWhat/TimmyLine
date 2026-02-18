import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { listAnalysts, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

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
		});
		return json(results);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
