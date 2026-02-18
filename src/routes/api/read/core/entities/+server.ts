import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { listEntities, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

	try {
		const results = await listEntities({
			uuid: url.searchParams.get('uuid') || undefined,
			incident_id: url.searchParams.get('incident_id') || undefined,
			entered_by: url.searchParams.get('entered_by') || undefined,
			entity_type: url.searchParams.get('entity_type') || undefined,
			created_at: url.searchParams.get('created_at') ? parseInt(url.searchParams.get('created_at')!) : undefined,
			updated_at: url.searchParams.get('updated_at') ? parseInt(url.searchParams.get('updated_at')!) : undefined,
			first_seen: url.searchParams.get('first_seen') ? parseInt(url.searchParams.get('first_seen')!) : undefined,
			last_seen: url.searchParams.get('last_seen') ? parseInt(url.searchParams.get('last_seen')!) : undefined,
			identifier: url.searchParams.get('identifier') || undefined,
			display_name: url.searchParams.get('display_name') || undefined,
			attributes: url.searchParams.get('attributes') || undefined,
			status: url.searchParams.get('status') || undefined,
			criticality: url.searchParams.get('criticality') || undefined,
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
