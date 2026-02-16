import { sqliteTable, text, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { investigation_actions } from './02_03_core_investigation_actions';
import { entities } from './02_05_core_entities';
import { relation_type } from './01_03_lookup_relation_type';

// Links actions to entities
// Shows which entities were involved in or affected by investigation actions
export const action_entities = sqliteTable(
	'action_entities',
	{
		action_id: text('action_id')
			.notNull()
			.references(() => investigation_actions.uuid, { onDelete: 'cascade' }),
		entity_id: text('entity_id')
			.notNull()
			.references(() => entities.uuid, { onDelete: 'cascade' }),
		relation_type: text('relation_type', { length: 50 })
			.notNull()
			.references(() => relation_type.name)
	},
	(table) => [
		primaryKey({ columns: [table.action_id, table.entity_id] }),
		index('idx_action_entities_entity_id').on(table.entity_id)
	]
);

// Define relations for query API
export const actionEntitiesRelations = relations(action_entities, ({ one }) => ({
	action: one(investigation_actions, {
		fields: [action_entities.action_id],
		references: [investigation_actions.uuid]
	}),
	entity: one(entities, {
		fields: [action_entities.entity_id],
		references: [entities.uuid]
	})
}));

// Export types for use throughout the app
export type ActionEntity = typeof action_entities.$inferSelect;
export type NewActionEntity = typeof action_entities.$inferInsert;