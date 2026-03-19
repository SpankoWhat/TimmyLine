/**
 * TimmyLine — Production Database Migration Script
 *
 * This script uses Drizzle ORM's programmatic migrate() function, which only
 * needs `drizzle-orm` and `better-sqlite3` — both regular dependencies.
 * It reads the migration SQL files from the `drizzle/` directory and applies
 * any that haven't been run yet.
 *
 * Usage:
 *   node migrate.js
 *
 * In Docker, this runs automatically via the entrypoint before the server starts.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL || './data/timmyLine.db';

// Ensure the directory for the database file exists
try {
	mkdirSync(dirname(DATABASE_URL), { recursive: true });
} catch {
	// directory already exists
}

console.log(`Running migrations against: ${DATABASE_URL}`);

const client = new Database(DATABASE_URL);
const db = drizzle(client);

try {
	migrate(db, { migrationsFolder: './drizzle' });
	console.log('✅ Migrations applied successfully');
} catch (error) {
	console.error('❌ Migration failed:', error.message);
	process.exit(1);
} finally {
	client.close();
}
