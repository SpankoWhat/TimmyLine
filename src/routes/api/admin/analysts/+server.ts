import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdminAccess, buildServiceContext } from '$lib/server/auth/authorization';
import { listAnalysts, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireAdminAccess(event);
	const ctx = buildServiceContext(event);

	try {
		const analysts = await listAnalysts({ include_deleted: true }, ctx);
		return json(analysts);
	} catch (e: unknown) {
		if (e instanceof ServiceError) {
			return json({ error: e.message, code: e.code }, { status: e.status });
		}
		throw e;
	}
};
