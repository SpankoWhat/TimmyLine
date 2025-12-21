import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { authUsers } from './01_06_auth_users';

/**
 * Auth Accounts Table
 * Stores OAuth provider-specific account information.
 * A user can have multiple accounts (e.g., Google + Microsoft).
 */
export const authAccounts = sqliteTable(
	'auth_accounts',
	{
		userId: text('userId')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		type: text('type').notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(account) => ({
		compoundKey: primaryKey({
			columns: [account.provider, account.providerAccountId]
		})
	})
);

export type AuthAccount = typeof authAccounts.$inferSelect;
export type NewAuthAccount = typeof authAccounts.$inferInsert;
