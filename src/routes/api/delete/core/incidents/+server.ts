import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireAdminAccess } from '$lib/server/auth/authorization';
import { deleteIncident, ServiceError, type ServiceRole } from '$lib/server/services';

export const POST: RequestHandler = async (event) => {
	await requireAdminAccess(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const session = event.locals.session;
	const ctx = {
		actorUUID: session?.user?.analystUUID || 'unknown',
		actorRole: (session?.user?.analystRole || 'observer') as ServiceRole
	};

	try {
		await deleteIncident(body, ctx);
		return json(true);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
