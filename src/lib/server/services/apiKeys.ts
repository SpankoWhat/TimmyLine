/**
 * API Keys Service
 *
 * Service layer for API key management. Wraps the auth/apiKeys module
 * to provide the same service pattern used by all other services.
 */

import { generateApiKey, listApiKeys as listApiKeysAuth, revokeApiKey as revokeApiKeyAuth } from '$lib/server/auth/apiKeys';
import {
	ServiceError,
	requireActorUserId,
	requireReadServiceAccess,
	validateRequired,
	type ServiceContext
} from './types';

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_KEY_ROLES = ['reader', 'analyst', 'admin'] as const;
const ROLE_HIERARCHY = ['reader', 'analyst', 'admin'] as const;

// ============================================================================
// List
// ============================================================================


export async function listApiKeysService(ctx: ServiceContext) {
	requireReadServiceAccess(ctx);
	const userId = requireActorUserId(ctx);

	return listApiKeysAuth(userId);
}

// ============================================================================
// Create
// ============================================================================

export async function createApiKey(
	data: {
		name: string;
		role?: string;
		expires_at?: number;
	},
	ctx: ServiceContext
) {
	requireReadServiceAccess(ctx);
	const actorUserId = requireActorUserId(ctx);

	validateRequired(data as unknown as Record<string, unknown>, ['name']);

	if (typeof data.name !== 'string' || data.name.trim().length === 0) {
		throw new ServiceError(400, 'INVALID_FIELD', 'Field "name" must be a non-empty string');
	}

	const keyRole = (data.role as (typeof ALLOWED_KEY_ROLES)[number]) ?? 'analyst';
	if (!ALLOWED_KEY_ROLES.includes(keyRole as (typeof ALLOWED_KEY_ROLES)[number])) {
		throw new ServiceError(400, 'INVALID_ENUM', `Invalid role. Must be one of: ${ALLOWED_KEY_ROLES.join(', ')}`);
	}

	// Users cannot create keys with a higher role than their own
	const userLevel = ROLE_HIERARCHY.indexOf(ctx.actorRole as (typeof ROLE_HIERARCHY)[number]);
	const requestedLevel = ROLE_HIERARCHY.indexOf(keyRole as (typeof ROLE_HIERARCHY)[number]);
	if (requestedLevel > userLevel) {
		throw new ServiceError(403, 'ROLE_ESCALATION', 'Cannot create an API key with a higher role than your own');
	}

	// Validate expires_at
	if (data.expires_at !== undefined) {
		if (typeof data.expires_at !== 'number' || data.expires_at < Math.floor(Date.now() / 1000)) {
			throw new ServiceError(400, 'INVALID_FIELD', 'expires_at must be a future Unix timestamp (epoch seconds)');
		}
	}

	if (!ctx.actorUUID) {
		throw new ServiceError(400, 'MISSING_CONTEXT', 'Service context must include actorUserId and actorUUID');
	}

	const { plaintextKey, record } = await generateApiKey({
		name: data.name.trim(),
		user_id: actorUserId,
		analyst_uuid: ctx.actorUUID,
		role: keyRole as 'reader' | 'analyst' | 'admin',
		expires_at: data.expires_at
	});

	return { plaintextKey, record };
}

// ============================================================================
// Revoke
// ============================================================================

export async function revokeApiKeyService(
	data: { id: string },
	ctx: ServiceContext
) {
	requireReadServiceAccess(ctx);
	const actorUserId = requireActorUserId(ctx);

	validateRequired(data as unknown as Record<string, unknown>, ['id']);

	const revoked = await revokeApiKeyAuth(data.id, actorUserId);
	if (!revoked) {
		throw new ServiceError(404, 'NOT_FOUND', 'API key not found, already revoked, or does not belong to you');
	}

	return revoked;
}
