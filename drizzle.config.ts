import { defineConfig } from 'drizzle-kit';
import { getConfig } from './config.js';

const DB_PATH = getConfig().database.filePath;

export default defineConfig({
	schema: './src/lib/server/database',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: DB_PATH
	},
	verbose: true,
	strict: true
});
