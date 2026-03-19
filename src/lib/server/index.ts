import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './database/index';
import { logger } from './logging/index';

// Environment variable loading
import 'dotenv/config';
const DATABASE_URL = process.env.DATABASE_URL || './data/timmyLine.db';

if (!process.env.DATABASE_URL) {
    logger.warn(`DATABASE_URL not set — defaulting to ${DATABASE_URL}`);
}

const client = new Database(DATABASE_URL);
export const db = drizzle(client, { schema });