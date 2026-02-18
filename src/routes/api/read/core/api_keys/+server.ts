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
	const analystUUID = session.user?.analystUUID;

	if (!analystUUID) {
		throw error(400, 'No analyst profile linked to this account');
	}

	const keys = await listApiKeys(analystUUID);
	return json(keys);
};
