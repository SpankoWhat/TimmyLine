import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Auth Users Table
 * Stores authenticated user accounts from OAuth providers.
 * Links to analysts table for application-level roles and permissions.
 */
export const authUsers = sqliteTable('auth_users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	email: text('email').notNull().unique(),
	emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
	name: text('name'),
	image: text('image')
});

export type AuthUser = typeof authUsers.$inferSelect;
export type NewAuthUser = typeof authUsers.$inferInsert;
