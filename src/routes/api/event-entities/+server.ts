import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireWriteAccess, buildServiceContext } from '$lib/server/auth/authorization';
import { createEventEntity, updateEventEntity, deleteJunction, ServiceError } from '$lib/server/services';

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
		const result = await createEventEntity(body, ctx);
		return json(result, { status: 201 });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};

export const PATCH: RequestHandler = async (event) => {
	await requireWriteAccess(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		const result = await updateEventEntity(body, ctx);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};

export const DELETE: RequestHandler = async (event) => {
	await requireWriteAccess(event);

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		await deleteJunction({ ...body, table: 'event_entities' }, ctx);
		return json({ success: true });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
