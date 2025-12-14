import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { investigation_actions } from './02_03_core_investigation_actions';
import { timeline_events } from './02_02_core_timeline_events';
import { relation_type } from './01_03_lookup_relation_type';

// Links events to actions
// Shows which investigation actions were triggered by or related to specific events
export const action_events = sqliteTable(
	'action_events',
	{
		action_id: text('action_id')
			.notNull()
			.references(() => investigation_actions.uuid, { onDelete: 'cascade' }),
		event_id: text('event_id')
			.notNull()
			.references(() => timeline_events.uuid, { onDelete: 'cascade' }),
		relation_type: text('relation_type', { length: 50 })
			.notNull()
			.references(() => relation_type.name)
	},
	(table) => [primaryKey({ columns: [table.action_id, table.event_id] })]
);

// Define relations for query API
export const actionEventsRelations = relations(action_events, ({ one }) => ({
	action: one(investigation_actions, {
		fields: [action_events.action_id],
		references: [investigation_actions.uuid]
	}),
	event: one(timeline_events, {
		fields: [action_events.event_id],
		references: [timeline_events.uuid]
	})
}));

// Export types for use throughout the app
export type ActionEvent = typeof action_events.$inferSelect;
export type NewActionEvent = typeof action_events.$inferInsert;