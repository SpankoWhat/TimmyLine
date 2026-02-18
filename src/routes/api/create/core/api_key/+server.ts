import type { RequestHandler } from './$types';
import { error, json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/authorization';
import { generateApiKey } from '$lib/server/auth/apiKeys';

/**
 * POST /api/create/core/api_key
 * Generate a new API key for the authenticated analyst.
 * Returns the plaintext key ONCE — it cannot be retrieved again.
 *
 * Body: { name: string, role?: string, expires_at?: number }
 */
export const POST: RequestHandler = async (event) => {
	const session = await requireAuth(event);
	const analystUUID = session.user?.analystUUID;

	if (!analystUUID) {
		throw error(400, 'No analyst profile linked to this account');
	}

	let body: Record<string, unknown>;
	try {
		body = await event.request.json();
	} catch {
		throw error(400, 'Invalid JSON body');
	}

	const { name, role, expires_at } = body as {
		name?: string;
		role?: string;
		expires_at?: number;
	};

	if (!name || typeof name !== 'string' || name.trim().length === 0) {
		throw error(400, 'Field "name" is required');
	}

	// Validate role
	const allowedRoles = ['read-only', 'analyst', 'on-point lead'] as const;
	const keyRole = (role as typeof allowedRoles[number]) ?? 'analyst';
	if (!allowedRoles.includes(keyRole)) {
		throw error(400, `Invalid role. Must be one of: ${allowedRoles.join(', ')}`);
	}

	// Users cannot create keys with a higher role than their own
	const analystRole = session.user?.analystRole;
	const roleHierarchy = ['read-only', 'observer', 'analyst', 'on-point lead'];
	const userLevel = roleHierarchy.indexOf(analystRole ?? 'observer');
	const requestedLevel = roleHierarchy.indexOf(keyRole);
	if (requestedLevel > userLevel) {
		throw error(403, 'Cannot create an API key with a higher role than your own');
	}

	// Validate expires_at
	if (expires_at !== undefined) {
		if (typeof expires_at !== 'number' || expires_at < Math.floor(Date.now() / 1000)) {
			throw error(400, 'expires_at must be a future Unix timestamp (epoch seconds)');
		}
	}

	const { plaintextKey, record } = await generateApiKey({
		name: name.trim(),
		analyst_uuid: analystUUID,
		role: keyRole,
		expires_at: expires_at
	});

	return json({
		message: 'API key created. Save this key — it will not be shown again.',
		key: plaintextKey,
		id: record.id,
		key_prefix: record.key_prefix,
		name: record.name,
		role: record.role,
		expires_at: record.expires_at,
		created_at: record.created_at
	});
};
