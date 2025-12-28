import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { incidents } from './02_01_core_incidents';
import { analysts } from './02_00_core_analysts';
import { annotation_type } from './01_04_lookup_annotation_type';

// Annotations table
// Collaborative notes, hypotheses, and observations
export const annotations = sqliteTable('annotations', {
	uuid: text('uuid').primaryKey().$defaultFn(() => crypto.randomUUID()),
	incident_id: text('incident_id')
		.notNull()
		.references(() => incidents.uuid, { onDelete: 'cascade' }),
	noted_by: text('noted_by')
		.notNull()
		.references(() => analysts.uuid, { onDelete: 'restrict' }),
	annotation_type: text('annotation_type', { length: 50 })
		.notNull()
		.references(() => annotation_type.name),
	created_at: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updated_at: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
	content: text('content').notNull(),
	confidence: text('confidence', { enum: ['high', 'medium', 'low', 'guess'] }),
	refers_to: text('refers_to'),
	is_hypothesis: integer('is_hypothesis', { mode: 'boolean' }).default(sql`0`),
	tags: text('tags'),
	deleted_at: integer('deleted_at') // NULL = active, timestamp = soft deleted
});

// Export types for use throughout the app
export type Annotation = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;
