import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Annotation types lookup table
// Defines types of annotations (e.g., hypothesis, observation, question, evidence_link)
export const annotation_type = sqliteTable('annotation_type', {
	name: text('name', { length: 50 }).primaryKey(),
	description: text('description', { length: 100 }),
	deleted_at: integer('deleted_at')
});

// Export types for use throughout the app
export type AnnotationType = typeof annotation_type.$inferSelect;
export type NewAnnotationType = typeof annotation_type.$inferInsert;
