import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/authorization';
import { revokeApiKey } from '$lib/server/auth/apiKeys';

/**
 * POST /api/delete/core/api_key
 * Revoke an API key. Only the owning analyst can revoke their own keys.
 *
 * Body: { id: string }
 */
export const POST: RequestHandler = async (event) => {
	const session = await requireAuth(event);
	const userId = session.user?.id;

	if (!userId) {
		throw error(400, 'No user account linked to this session');
	}

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { id } = body as { id?: string };
	if (!id || typeof id !== 'string') {
		throw error(400, 'Field "id" is required');
	}

	const revoked = await revokeApiKey(id, userId);
	if (!revoked) {
		throw error(404, 'API key not found, already revoked, or does not belong to you');
	}

	return json({
		message: 'API key revoked',
		id: revoked.id,
		name: revoked.name,
		revoked_at: revoked.revoked_at
	});
};
