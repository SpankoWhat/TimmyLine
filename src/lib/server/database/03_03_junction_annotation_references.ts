import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { annotations } from './02_04_core_annotations';

// Annotation references
// Links annotations to various objects (events, actions, entities) for contextual notes
export const annotation_references = sqliteTable(
	'annotation_references',
	{
		annotation_id: text('annotation_id')
			.notNull()
			.references(() => annotations.uuid, { onDelete: 'cascade' }),
		reference_type: text('reference_type', {
			enum: ['event', 'action', 'entity', 'incident']
		}),
		reference_id: text('reference_id').notNull(), // UUID of the referenced object
		context: text('context')
	},
	(table) => [primaryKey({ columns: [table.annotation_id, table.reference_type, table.reference_id] })]
);

// Export types for use throughout the app
export type AnnotationReference = typeof annotation_references.$inferSelect;
export type NewAnnotationReference = typeof annotation_references.$inferInsert;