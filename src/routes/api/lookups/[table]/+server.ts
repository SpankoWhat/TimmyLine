import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import {
	listLookups,
	createLookup,
	updateLookup,
	softDeleteLookup,
	restoreLookup,
	deleteLookup,
	ServiceError
} from '$lib/server/services';
import type { LookupTableName } from '$lib/types/common';

const VALID_TABLES: LookupTableName[] = ['event_type', 'action_type', 'relation_type', 'annotation_type', 'entity_type'];

function validateTable(table: string): LookupTableName {
	if (!VALID_TABLES.includes(table as LookupTableName)) {
		throw new ServiceError(400, 'INVALID_TABLE', `Invalid lookup table: ${table}. Must be one of: ${VALID_TABLES.join(', ')}`);
	}
	return table as LookupTableName;
}

export const GET: RequestHandler = async (event) => {
	const table = validateTable(event.params.table);
	const include_deleted = event.url.searchParams.get('include_deleted') === 'true';
	const ctx = buildServiceContext(event);

	try {
		const results = await listLookups({ table, include_deleted }, ctx);
		return json(results);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	const table = validateTable(event.params.table);

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		const result = await createLookup({ ...body, table }, ctx);
		return json(result, { status: 201 });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};

export const PATCH: RequestHandler = async (event) => {
	const table = validateTable(event.params.table);

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		// Dispatch based on body shape
		if (body.action === 'soft-delete') {
			const result = await softDeleteLookup({ table, name: body.name }, ctx);
			return json(result);
		}

		if (body.action === 'restore') {
			const result = await restoreLookup({ table, name: body.name }, ctx);
			return json(result);
		}

		// Default: standard update
		const result = await updateLookup({ table, old_name: body.old_name, name: body.name, description: body.description }, ctx);
		return json(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};

export const DELETE: RequestHandler = async (event) => {
	const table = validateTable(event.params.table);

	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		await deleteLookup({ table, name: body.name }, ctx);
		return json({ success: true });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
