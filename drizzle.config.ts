import { defineConfig } from 'drizzle-kit';

// Ensure environment variables
import 'dotenv/config';
const DATABASE_URL = process.env.DATABASE_URL || 'C:\\Users\\gwale\\Documents\\_Projects\\TimmyLine\\src\\lib\\server\\data\\timmyLine.db';

export default defineConfig({
	schema: './src/lib/server/database',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: DATABASE_URL
	},
	verbose: true,
	strict: true
});
