import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Entity types lookup table
// Defines types of entities (e.g., ip_address, domain, file_hash, user_account, host)
export const entity_type = sqliteTable('entity_type', {
	name: text('name', { length: 50 }).primaryKey(),
	description: text('description', { length: 100 })
});

// Export types for use throughout the app
export type EntityType = typeof entity_type.$inferSelect;
export type NewEntityType = typeof entity_type.$inferInsert;
