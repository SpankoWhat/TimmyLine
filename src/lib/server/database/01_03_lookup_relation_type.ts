import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Relation types lookup table
// Defines how entities relate to events/actions (e.g., source, target, created_by, modified_by)
export const relation_type = sqliteTable('relation_type', {
	name: text('name', { length: 50 }).primaryKey(),
	description: text('description', { length: 100 }),
	deleted_at: integer('deleted_at')
});

// Export types for use throughout the app
export type RelationType = typeof relation_type.$inferSelect;
export type NewRelationType = typeof relation_type.$inferInsert;
