import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { incidents } from './02_01_core_incidents';
import { analysts } from './02_00_core_analysts';
import { action_type } from './01_02_lookup_action_type';

// Investigation actions table
// Tracks all actions taken during investigation
export const investigation_actions = sqliteTable('investigation_actions', {
	uuid: text('uuid').primaryKey().$defaultFn(() => crypto.randomUUID()),
	incident_id: text('incident_id')
		.notNull()
		.references(() => incidents.uuid, { onDelete: 'cascade' }),
	actioned_by: text('actioned_by')
		.notNull()
		.references(() => analysts.uuid, { onDelete: 'restrict' }),
	action_type: text('action_type', { length: 50 })
		.notNull()
		.references(() => action_type.name),
	created_at: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updated_at: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
	performed_at: integer('performed_at').notNull(),
	action_data: text('action_data'),
	result: text('result', { enum: ['success', 'failed', 'partial', 'pending'] }),
	tool_used: text('tool_used', { length: 100 }),
	notes: text('notes'),
	next_steps: text('next_steps'),
	tags: text('tags')
});

// Export types for use throughout the app
export type InvestigationAction = typeof investigation_actions.$inferSelect;
export type NewInvestigationAction = typeof investigation_actions.$inferInsert;
