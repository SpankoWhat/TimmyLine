import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { incidents } from './02_01_core_incidents';
import { analysts } from './02_00_core_analysts';
import { entity_type } from './01_05_lookup_entity_type';

// Entities table
// IOCs, assets, and other entities involved in incidents
export const entities = sqliteTable(
	'entities',
	{
		uuid: text('uuid').primaryKey().$defaultFn(() => crypto.randomUUID()),
		incident_id: text('incident_id')
			.notNull()
			.references(() => incidents.uuid, { onDelete: 'cascade' }),
		entered_by: text('entered_by')
			.notNull()
			.references(() => analysts.uuid, { onDelete: 'restrict' }), // analyst.uuid
		entity_type: text('entity_type', { length: 50 })
			.notNull()
			.references(() => entity_type.name),
		created_at: integer('created_at').default(sql`(strftime('%s', 'now'))`),
		updated_at: integer('updated_at').default(sql`(strftime('%s', 'now'))`),
		first_seen: integer('first_seen'),
		last_seen: integer('last_seen'),
		identifier: text('identifier', { length: 500 }).notNull(), // The actual IOC/entity value
		display_name: text('display_name', { length: 200 }),
		attributes: text('attributes'), // JSON for flexible attributes
		status: text('status', { enum: ['active', 'inactive', 'unknown'] }),
		criticality: text('criticality', { enum: ['critical', 'high', 'medium', 'low', 'unknown'] }),
		tags: text('tags') // JSON array of tags
	},
	(table) => [
		uniqueIndex('unique_incident_identifier').on(table.incident_id, table.identifier)
	]
);

// Export types for use throughout the app
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;