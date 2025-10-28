import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './database/index';

const DATABASE_URL = process.env.DATABASE_URL || 'C:/Users/gwale/Documents/_Projects/TimmyLine/data/timmyD.sqlite';

const client = new Database(DATABASE_URL);
export const db = drizzle(client, { schema });