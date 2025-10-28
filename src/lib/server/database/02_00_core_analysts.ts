import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Analysts table
// Stores information about analysts working on incidents
// 'active' field allows soft deletion while preserving historical attribution
export const analysts = sqliteTable('analysts', {
	uuid: text('uuid').primaryKey().$defaultFn(() => crypto.randomUUID()),
	username: text('username', { length: 100 }).notNull().unique(),
	full_name: text('full_name', { length: 100 }),
	role: text('role', { enum: ['analyst', 'on-point lead', 'observer'] }),
	active: integer('active', { mode: 'boolean' }).default(sql`1`),
	created_at: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updated_at: integer('updated_at').default(sql`(strftime('%s', 'now'))`)
});

// Export types for use throughout the app
export type Analyst = typeof analysts.$inferSelect;
export type NewAnalyst = typeof analysts.$inferInsert;
