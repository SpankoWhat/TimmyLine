import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './database/index';
import { logger } from './logging/index';
import { getConfig } from './config';

const { filePath: DB_PATH } = getConfig().database;
logger.info(`Opening database at ${DB_PATH}`);

const client = new Database(DB_PATH);
export const db = drizzle(client, { schema });