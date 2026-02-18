import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireWriteAccess } from '$lib/server/auth/authorization';
import { updateAnnotation, ServiceError, type ServiceRole } from '$lib/server/services';

export const POST: RequestHandler = async (event) => {
	await requireWriteAccess(event);

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
		const result = await updateAnnotation(body, ctx);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};