import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Incidents table
// Core incident tracking with SOAR integration support
export const incidents = sqliteTable('incidents', {
	uuid: text('uuid').primaryKey().$defaultFn(() => crypto.randomUUID()),
	soar_ticket_id: text('soar_ticket_id', { length: 10 }).unique(),
	title: text('title', { length: 500 }).notNull(),
	status: text('status', { enum: ['In Progress', 'Post-Mortem', 'Closed'] }).notNull(),
	priority: text('priority', { enum: ['critical', 'high', 'medium', 'low'] }).notNull(),
	created_at: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updated_at: integer('updated_at').default(sql`(strftime('%s', 'now'))`)
});

// Export types for use throughout the app
export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
