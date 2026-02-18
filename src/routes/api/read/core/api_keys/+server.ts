import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/authorization';
import { listApiKeys } from '$lib/server/auth/apiKeys';

/**
 * GET /api/read/core/api_keys
 * List all API keys for the authenticated analyst.
 * Returns metadata only — never exposes the key hash.
 */
export const GET: RequestHandler = async (event) => {
	const session = await requireAuth(event);
	const userId = session.user?.id;

	if (!userId) {
		throw error(400, 'No user account linked to this session');
	}

	const keys = await listApiKeys(userId);
	return json(keys);
};
