import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdminAccess, buildServiceContext } from '$lib/server/auth/authorization';
import { updateAnalyst, ServiceError } from '$lib/server/services';

export const PATCH: RequestHandler = async (event) => {
	await requireAdminAccess(event);

	try {
		const uuid = event.params.uuid;
		const body = await event.request.json();
		const ctx = buildServiceContext(event);
		const updated = await updateAnalyst({ uuid, ...body }, ctx);
		return json(updated);
	} catch (e: unknown) {
		if (e instanceof ServiceError) {
			return json({ error: e.message, code: e.code }, { status: e.status });
		}
		throw e;
	}
};
