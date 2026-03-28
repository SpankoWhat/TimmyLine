/**
 * TimmyLine Application Configuration (SvelteKit wrapper)
 *
 * Reads infrastructure settings from a JSON config file on disk.  These are
 * settings that the application needs **at boot time** (logging paths, auth
 * provider toggles, database path, web server port/origin) — they live
 * outside the database so the app can read them before any DB initialisation.
 *
 * The actual read/parse/merge logic lives in the project-root `config.js`
 * so that standalone scripts (server.js, migrate.js, seed.ts, drizzle.config.ts)
 * can also access the config without importing from `$lib/server`.
 *
 * This module adds:
 *   - TypeScript types
 *   - In-memory caching (singleton)
 *   - Hot-reload support (`reloadConfig()`)
 *   - Write-back for the admin settings API
 *
 * Usage:
 *   import { getConfig, reloadConfig } from '$lib/server/config';
 *   const cfg = getConfig();
 *   cfg.logging.writeToFile;    // boolean
 *   cfg.database.filePath;      // "./data/timmyLine.db"
 *   cfg.webServer.port;         // 3000
 *
 * Hot-reload:
 *   After the admin API writes an updated config file, call `reloadConfig()`
 *   so that per-request checks (e.g. API-key auth toggle) pick up the change
 *   without a full server restart. Settings consumed only at module-init time
 *   (e.g. Auth.js providers, logger file path) still require a restart.
 */

import { writeFileSync } from 'node:fs';
import {
	readConfigFile as _readConfigFile,
	resolveConfigPath,
	CONFIG_DEFAULTS
} from '../../../../config.js';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface TimmyLineConfig {
	logging: {
		/** Absolute or relative path to the log file */
		filePath: string;
		/** Whether to write logs to file (instead of stdout) */
		writeToFile: boolean;
	};
	database: {
		/** Absolute or relative path to the SQLite database file */
		filePath: string;
	};
	auth: {
		google: { enabled: boolean };
		microsoft: { enabled: boolean };
		github: { enabled: boolean };
		apiKeys: { enabled: boolean };
	};
	webServer: {
		/** Port the production server listens on */
		port: number;
		/** Public origin URL (used by SvelteKit and Socket.IO CORS) */
		origin: string;
	};
}

// re-export defaults so other server modules can reference them
const DEFAULTS: TimmyLineConfig = CONFIG_DEFAULTS as TimmyLineConfig;

// ────────────────────────────────────────────────────────────────────────────
// Read / write
// ────────────────────────────────────────────────────────────────────────────

function readConfigFile(): TimmyLineConfig {
	return _readConfigFile() as TimmyLineConfig;
}

/**
 * Write the full config object to disk as formatted JSON.
 * Called by the admin settings API after applying changes.
 */
export function writeConfigFile(config: TimmyLineConfig): void {
	const filePath = resolveConfigPath();
	writeFileSync(filePath, JSON.stringify(config, null, '\t') + '\n', 'utf-8');
}

// ────────────────────────────────────────────────────────────────────────────
// Singleton cache
// ────────────────────────────────────────────────────────────────────────────

let cached: TimmyLineConfig = readConfigFile();

/** Return the current (cached) config. */
export function getConfig(): Readonly<TimmyLineConfig> {
	return cached;
}

/**
 * Re-read the config file from disk and update the in-memory cache.
 * Call after saving changes so per-request checks pick up new values.
 */
export function reloadConfig(): TimmyLineConfig {
	cached = readConfigFile();
	return cached;
}

export { DEFAULTS as CONFIG_DEFAULTS };
