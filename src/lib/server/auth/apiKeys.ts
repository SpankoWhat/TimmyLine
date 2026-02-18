import { createHash, randomBytes } from 'crypto';
import { db } from '$lib/server';
import { apiKeys, analysts, authUsers } from '$lib/server/database';
import { eq, and, isNull, or, gt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const KEY_PREFIX = 'tml_';
const KEY_BYTES = 32; // 32 bytes = 64 hex chars

/**
 * Generate a new API key.
 * Returns the plaintext key (show once!) and the DB record.
 */
export async function generateApiKey(opts: {
	name: string;
	user_id: string;
	analyst_uuid: string;
	role?: 'read-only' | 'analyst' | 'on-point lead';
	expires_at?: number;
}) {
	const rawBytes = randomBytes(KEY_BYTES);
	const plaintextKey = `${KEY_PREFIX}${rawBytes.toString('hex')}`;
	const keyHash = hashKey(plaintextKey);
	const keyPrefixDisplay = plaintextKey.slice(0, 12); // "tml_a1b2c3d4"

	const [record] = await db
		.insert(apiKeys)
		.values({
			key_prefix: keyPrefixDisplay,
			key_hash: keyHash,
			name: opts.name,
			user_id: opts.user_id,
			analyst_uuid: opts.analyst_uuid,
			role: opts.role ?? 'analyst',
			expires_at: opts.expires_at ?? null
		})
		.returning();

	return { plaintextKey, record };
}

/**
 * Hash an API key using SHA-256.
 */
export function hashKey(key: string): string {
	return createHash('sha256').update(key).digest('hex');
}

/**
 * Validate an API key and return the associated analyst info.
 * Returns null if the key is invalid, revoked, or expired.
 */
export async function validateApiKey(plaintextKey: string) {
	if (!plaintextKey.startsWith(KEY_PREFIX)) {
		return null;
	}

	const keyHash = hashKey(plaintextKey);
	const now = Math.floor(Date.now() / 1000);

	const results = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			role: apiKeys.role,
			user_id: apiKeys.user_id,
			analyst_uuid: apiKeys.analyst_uuid,
			expires_at: apiKeys.expires_at,
			revoked_at: apiKeys.revoked_at,
			// Analyst fields
			analystUsername: analysts.username,
			analystRole: analysts.role,
			analystEmail: analysts.email,
			analystFullName: analysts.full_name,
			analystActive: analysts.active
		})
		.from(apiKeys)
		.innerJoin(analysts, eq(apiKeys.analyst_uuid, analysts.uuid))
		.where(eq(apiKeys.key_hash, keyHash))
		.limit(1);

	if (results.length === 0) {
		return null;
	}

	const key = results[0];

	// Check revoked
	if (key.revoked_at !== null) {
		return null;
	}

	// Check expired
	if (key.expires_at !== null && key.expires_at < now) {
		return null;
	}

	// Check analyst is active
	if (!key.analystActive) {
		return null;
	}

	// Update last_used_at (fire-and-forget)
	db.update(apiKeys)
		.set({ last_used_at: now })
		.where(eq(apiKeys.key_hash, keyHash))
		.run();

	return {
		keyId: key.id,
		keyName: key.name,
		keyRole: key.role,
		userId: key.user_id,
		analystUUID: key.analyst_uuid,
		analystUsername: key.analystUsername,
		analystRole: key.analystRole,
		analystEmail: key.analystEmail,
		analystFullName: key.analystFullName
	};
}

/**
 * List all API keys for a user (without sensitive hash data).
 */
export async function listApiKeys(userId: string) {
	return db
		.select({
			id: apiKeys.id,
			key_prefix: apiKeys.key_prefix,
			name: apiKeys.name,
			role: apiKeys.role,
			user_id: apiKeys.user_id,
			analyst_uuid: apiKeys.analyst_uuid,
			last_used_at: apiKeys.last_used_at,
			expires_at: apiKeys.expires_at,
			created_at: apiKeys.created_at,
			revoked_at: apiKeys.revoked_at
		})
		.from(apiKeys)
		.where(eq(apiKeys.user_id, userId));
}

/**
 * Revoke an API key by setting revoked_at.
 * Only the owning user can revoke their own keys.
 */
export async function revokeApiKey(keyId: string, userId: string) {
	const now = Math.floor(Date.now() / 1000);
	const result = await db
		.update(apiKeys)
		.set({ revoked_at: now })
		.where(
			and(
				eq(apiKeys.id, keyId),
				eq(apiKeys.user_id, userId),
				isNull(apiKeys.revoked_at)
			)
		)
		.returning();

	return result.length > 0 ? result[0] : null;
}
