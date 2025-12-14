import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';
import { incidents } from './02_01_core_incidents';
import { analysts } from './02_00_core_analysts';
import { event_type } from './01_01_lookup_event_type';
import { event_entities } from './03_01_junction_event_entities';
import { action_events } from './03_00_junction_action_events';

// Timeline events table
// Records all events in the incident timeline with rich metadata
export const timeline_events = sqliteTable('timeline_events', {
	uuid: text('uuid').primaryKey().$defaultFn(() => crypto.randomUUID()),
	incident_id: text('incident_id')
		.notNull()
		.references(() => incidents.uuid, { onDelete: 'cascade' }),
	discovered_by: text('discovered_by')
		.notNull()
		.references(() => analysts.uuid, { onDelete: 'restrict' }), // analyst.uuid
	event_type: text('event_type', { length: 50 })
		.notNull()
		.references(() => event_type.name),
	occurred_at: integer('occurred_at'), // When the event actually happened (sometime unknown)
	discovered_at: integer('discovered_at').notNull(), // When analyst discovered it
	created_at: integer('created_at').default(sql`(strftime('%s', 'now'))`),
	updated_at: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
	event_data: text('event_data').notNull(), // JSON data for flexible event details
	severity: text('severity', { enum: ['critical', 'high', 'medium', 'low', 'info'] }),
	confidence: text('confidence', { enum: ['high', 'medium', 'low', 'guess'] }),
	source_reliability: text('source_reliability', { enum: ['A', 'B', 'C', 'D', 'E', 'F'] }),
	source: text('source', { length: 200 }),
	tags: text('tags') // JSON array of tags
});

// Define relations for query API
export const timelineEventsRelations = relations(timeline_events, ({ many }) => ({
	eventEntities: many(event_entities),
	actionEvents: many(action_events)
}));

// Export types for use throughout the app
export type TimelineEvent = typeof timeline_events.$inferSelect;
export type NewTimelineEvent = typeof timeline_events.$inferInsert;
