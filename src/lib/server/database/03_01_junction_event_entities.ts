import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
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


// Export types for use throughout the app
export type EventEntity = typeof event_entities.$inferSelect;
export type NewEventEntity = typeof event_entities.$inferInsert;