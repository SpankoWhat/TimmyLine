import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import { listApiKeysService, createApiKey, revokeApiKeyService, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	const ctx = buildServiceContext(event);

	try {
		const keys = await listApiKeysService(ctx);
		return json(keys);
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
		const { plaintextKey, record } = await createApiKey(body, ctx);
		return json({
			message: 'API key created. Save this key — it will not be shown again.',
			key: plaintextKey,
			id: record.id,
			key_prefix: record.key_prefix,
			name: record.name,
			role: record.role,
			expires_at: record.expires_at,
			created_at: record.created_at
		}, { status: 201 });
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};

export const DELETE: RequestHandler = async (event) => {
	let body;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const ctx = buildServiceContext(event);

	try {
		const revoked = await revokeApiKeyService(body, ctx);
		return json({
			message: 'API key revoked',
			id: revoked.id,
			name: revoked.name,
			revoked_at: revoked.revoked_at
		});
	} catch (err) {
		if (err instanceof ServiceError) {
			return json({ error: err.message }, { status: err.status });
		}
		throw error(500, `Unexpected error: ${(err as Error).message}`);
	}
};
