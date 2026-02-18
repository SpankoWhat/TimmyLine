import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { listInvestigationActions, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireReadAccess(event);
	const { url } = event;

	try {
		const results = await listInvestigationActions({
			uuid: url.searchParams.get('uuid') || undefined,
			action_type: url.searchParams.get('action_type') || undefined,
			incident_id: url.searchParams.get('incident_id') || undefined,
			tags: url.searchParams.get('tags') || undefined,
			actioned_by: url.searchParams.get('actioned_by') || undefined,
			performed_at: url.searchParams.get('performed_at') ? parseInt(url.searchParams.get('performed_at')!) : undefined,
			action_data: url.searchParams.get('action_data') || undefined,
			result: url.searchParams.get('result') || undefined,
			tool_used: url.searchParams.get('tool_used') || undefined,
			notes: url.searchParams.get('notes') || undefined,
			next_steps: url.searchParams.get('next_steps') || undefined,
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