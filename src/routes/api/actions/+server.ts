import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import { listInvestigationActions, createInvestigationAction, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const ctx = buildServiceContext(event);

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
		const result = await createInvestigationAction(body, ctx);
		return json(result, { status: 201 });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
