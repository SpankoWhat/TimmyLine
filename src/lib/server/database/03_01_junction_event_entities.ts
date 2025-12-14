import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { timeline_events } from './02_02_core_timeline_events';
import { entities } from './02_05_core_entities';

// Links events to entities
// Maps which entities are involved in timeline events and their roles
export const event_entities = sqliteTable(
	'event_entities',
	{
		event_id: text('event_id')
			.notNull()
			.references(() => timeline_events.uuid, { onDelete: 'cascade' }),
		entity_id: text('entity_id')
			.notNull()
			.references(() => entities.uuid, { onDelete: 'cascade' }),
		role: text('role'), // e.g., 'source', 'target', 'observer'
		context: text('context') // Additional context about the relationship
	},
	(table) => [primaryKey({ columns: [table.event_id, table.entity_id] })]
);


// Define relations for query API
export const eventEntitiesRelations = relations(event_entities, ({ one }) => ({
	event: one(timeline_events, {
		fields: [event_entities.event_id],
		references: [timeline_events.uuid]
	}),
	entity: one(entities, {
		fields: [event_entities.entity_id],
		references: [entities.uuid]
	})
}));

// Export types for use throughout the app
export type EventEntity = typeof event_entities.$inferSelect;
export type NewEventEntity = typeof event_entities.$inferInsert;