import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import { listTimelineEvents, createTimelineEvent, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	const { url } = event;
	const ctx = buildServiceContext(event);

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
		const result = await createTimelineEvent(body, ctx);
		return json(result, { status: 201 });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
