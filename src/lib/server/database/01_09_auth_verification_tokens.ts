import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

/**
 * Auth Verification Tokens Table
 * Stores temporary tokens for email verification and password reset flows.
 */
export const authVerificationTokens = sqliteTable(
	'auth_verification_tokens',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: integer('expires', { mode: 'timestamp_ms' }).notNull()
	},
	(vt) => ({
		compoundKey: primaryKey({ columns: [vt.identifier, vt.token] })
	})
);

export type AuthVerificationToken = typeof authVerificationTokens.$inferSelect;
export type NewAuthVerificationToken = typeof authVerificationTokens.$inferInsert;
