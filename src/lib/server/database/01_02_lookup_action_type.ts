import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Action types lookup table
// Defines types of investigation actions (e.g., forensic_acquisition, malware_analysis, log_review)
export const action_type = sqliteTable('action_type', {
	name: text('name', { length: 50 }).primaryKey(),
	description: text('description', { length: 100 }),
	deleted_at: integer('deleted_at')
});

// Export types for use throughout the app
export type ActionType = typeof action_type.$inferSelect;
export type NewActionType = typeof action_type.$inferInsert;
