import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import { updateTimelineEvent, deleteTimelineEvent, ServiceError } from '$lib/server/services';

export const PATCH: RequestHandler = async (event) => {
	const { uuid } = event.params;

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		const result = await updateTimelineEvent({ ...body, uuid }, ctx);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};

export const DELETE: RequestHandler = async (event) => {
	const { uuid } = event.params;

	let body: Record<string, unknown> = {};
	try {
		body = await event.request.json();
	} catch {
		// DELETE may not have a body — that's fine
	}

	const ctx = buildServiceContext(event);

	try {
		await deleteTimelineEvent({ uuid, incident_id: body.incident_id as string | undefined }, ctx);
		return json({ success: true });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
