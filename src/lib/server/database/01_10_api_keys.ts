import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { analysts } from './02_00_core_analysts';

/**
 * API Keys Table
 * Stores hashed API keys for programmatic access (MCP servers, CI/CD, scripts).
 * Each key is linked to an analyst and acts on their behalf.
 *
 * Key format: `tml_<64-random-hex-chars>`
 * Only the SHA-256 hash is stored — the plaintext key is shown once at creation.
 */
export const apiKeys = sqliteTable('api_keys', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),

	/** First 12 chars of the key (e.g. "tml_a1b2c3d4") for identification in UI */
	key_prefix: text('key_prefix', { length: 16 }).notNull(),

	/** SHA-256 hash of the full API key */
	key_hash: text('key_hash').notNull().unique(),

	/** Human-friendly label (e.g. "Copilot MCP", "CI/CD Pipeline") */
	name: text('name', { length: 100 }).notNull(),

	/** The analyst this key acts on behalf of */
	analyst_uuid: text('analyst_uuid')
		.notNull()
		.references(() => analysts.uuid, { onDelete: 'cascade' }),

	/** Maximum permission level for this key */
	role: text('role', { enum: ['read-only', 'analyst', 'on-point lead'] })
		.notNull()
		.default('analyst'),

	/** Last time this key was used (epoch seconds) */
	last_used_at: integer('last_used_at'),

	/** Optional expiry timestamp (epoch seconds). NULL = never expires */
	expires_at: integer('expires_at'),

	created_at: integer('created_at').default(sql`(strftime('%s', 'now'))`),

	/** NULL = active, timestamp = revoked */
	revoked_at: integer('revoked_at')
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
