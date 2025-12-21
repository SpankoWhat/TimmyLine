import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './database/index';
import { logger } from './logging/index';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    logger.error('DATABASE_URL is not defined in environment variables.');
    throw new Error('DATABASE_URL is not defined in environment variables.');
}

const client = new Database(DATABASE_URL);
export const db = drizzle(client, { schema });