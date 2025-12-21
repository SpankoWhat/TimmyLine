import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';
import { authUsers } from './01_06_auth_users';

/**
 * Auth Sessions Table
 * Stores active user sessions for server-side session management.
 */
export const authSessions = sqliteTable('auth_sessions', {
	sessionToken: text('sessionToken')
		.primaryKey()
		.$defaultFn(() => createId()),
	userId: text('userId')
		.notNull()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	expires: integer('expires', { mode: 'timestamp_ms' }).notNull()
});

export type AuthSession = typeof authSessions.$inferSelect;
export type NewAuthSession = typeof authSessions.$inferInsert;
