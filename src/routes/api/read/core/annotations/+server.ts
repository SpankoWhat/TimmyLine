import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { listAnnotations, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

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
		});
		return json(results);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
