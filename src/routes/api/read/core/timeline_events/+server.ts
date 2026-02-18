import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { listTimelineEvents, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

	try {
		const results = await listTimelineEvents({
			uuid: url.searchParams.get('uuid') || undefined,
			incident_id: url.searchParams.get('incident_id') || undefined,
			discovered_by: url.searchParams.get('discovered_by') || undefined,
			event_type: url.searchParams.get('event_type') || undefined,
			occurred_at: url.searchParams.get('occurred_at') ? parseInt(url.searchParams.get('occurred_at')!) : undefined,
			discovered_at: url.searchParams.get('discovered_at') ? parseInt(url.searchParams.get('discovered_at')!) : undefined,
			created_at: url.searchParams.get('created_at') ? parseInt(url.searchParams.get('created_at')!) : undefined,
			updated_at: url.searchParams.get('updated_at') ? parseInt(url.searchParams.get('updated_at')!) : undefined,
			notes: url.searchParams.get('notes') || undefined,
			event_data: url.searchParams.get('event_data') || undefined,
			severity: url.searchParams.get('severity') || undefined,
			confidence: url.searchParams.get('confidence') || undefined,
			source_reliability: url.searchParams.get('source_reliability') || undefined,
			source: url.searchParams.get('source') || undefined,
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
