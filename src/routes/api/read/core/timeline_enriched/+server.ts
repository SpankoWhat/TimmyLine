import { json, type RequestEvent } from '@sveltejs/kit';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { getEnrichedTimeline, ServiceError } from '$lib/server/services';

export async function GET(event: RequestEvent) {
	await requireReadAccess(event);
	const { url } = event;

	try {
		const result = await getEnrichedTimeline({
			incident_id: url.searchParams.get('incident_id') || '',
			include_deleted: url.searchParams.get('include_deleted') === 'true'
		});
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Failed to fetch enriched timeline data' }, { status: 500 });
	}
}
