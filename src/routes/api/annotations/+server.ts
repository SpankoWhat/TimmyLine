import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import { listAnnotations, createAnnotation, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const ctx = buildServiceContext(event);

	try {
		const results = await listAnnotations({
			uuid: url.searchParams.get('uuid') || undefined,
			incident_id: url.searchParams.get('incident_id') || undefined,
			noted_by: url.searchParams.get('noted_by') || undefined,
			annotation_type: url.searchParams.get('annotation_type') || undefined,
			created_at: url.searchParams.get('created_at') ? parseInt(url.searchParams.get('created_at')!) : undefined,
			updated_at: url.searchParams.get('updated_at') ? parseInt(url.searchParams.get('updated_at')!) : undefined,
			content: url.searchParams.get('content') || undefined,
			confidence: url.searchParams.get('confidence') || undefined,
			refers_to: url.searchParams.get('refers_to') || undefined,
			is_hypothesis: url.searchParams.get('is_hypothesis') ? (url.searchParams.get('is_hypothesis') === 'true' || url.searchParams.get('is_hypothesis') === '1') : undefined,
			tags: url.searchParams.get('tags') || undefined,
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
		const result = await createAnnotation(body, ctx);
		return json(result, { status: 201 });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
