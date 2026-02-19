import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Event types lookup table
// Defines categories of timeline events (e.g., file_created, network_connection, process_execution)
export const event_type = sqliteTable('event_type', {
	name: text('name', { length: 50 }).primaryKey(),
	description: text('description', { length: 100 }),
	deleted_at: integer('deleted_at')
});

// Export types for use throughout the app
export type EventType = typeof event_type.$inferSelect;
export type NewEventType = typeof event_type.$inferInsert;
