import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import { getEnrichedTimeline, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const ctx = buildServiceContext(event);

	try {
		const result = await getEnrichedTimeline({
			incident_id: url.searchParams.get('incident_id') || '',
			include_deleted: url.searchParams.get('include_deleted') === 'true'
		}, ctx);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Failed to fetch enriched timeline data' }, { status: 500 });
	}
};
