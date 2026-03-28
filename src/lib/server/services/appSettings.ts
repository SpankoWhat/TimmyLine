/**
 * App Settings Service
 *
 * All application configuration lives in `timmyline.config.json` on disk.
 * Settings are read once at startup and cached in memory. The admin API can
 * write changes and hot-reload the cache, but some settings (logging path,
 * Auth.js providers) only take full effect after a server restart.
 *
 * Runtime-hot-reloadable: auth.apiKeys.enabled
 * Restart required: logging.*, auth.google/microsoft/github
 */

import { getConfig, writeConfigFile, reloadConfig } from '$lib/server/config';
import type { TimmyLineConfig } from '$lib/server/config';
import { ServiceError } from './types';
import type { ServiceContext } from './types';

// ============================================================================
// Queries
// ============================================================================

/**
 * Return the current config as a flat key-value map (matching the admin UI
 * shape so the admin page doesn't need heavy refactoring).
 */
export function getSettingsMap(): Record<string, string> {
	const cfg = getConfig();
	return {
		'auth.google_enabled': String(cfg.auth.google.enabled),
		'auth.microsoft_enabled': String(cfg.auth.microsoft.enabled),
		'auth.github_enabled': String(cfg.auth.github.enabled),
		'auth.api_keys_enabled': String(cfg.auth.apiKeys.enabled),
		'logging.file_path': cfg.logging.filePath,
		'logging.write_to_file': String(cfg.logging.writeToFile),
		'database.file_path': cfg.database.filePath,
		'web_server.port': String(cfg.webServer.port),
		'web_server.origin': cfg.webServer.origin
	};
}

/** Backwards-compatible alias used by the admin API GET handler */
export async function getAllSettings(): Promise<Record<string, string>> {
	return getSettingsMap();
}

// ============================================================================
// Mutations
// ============================================================================

/** Recognised flat keys and how they map into the structured config */
const KEY_MAP: Record<string, (cfg: TimmyLineConfig, v: string) => void> = {
	'auth.google_enabled': (c, v) => { c.auth.google.enabled = v === 'true'; },
	'auth.microsoft_enabled': (c, v) => { c.auth.microsoft.enabled = v === 'true'; },
	'auth.github_enabled': (c, v) => { c.auth.github.enabled = v === 'true'; },
	'auth.api_keys_enabled': (c, v) => { c.auth.apiKeys.enabled = v === 'true'; },
	'logging.file_path': (c, v) => { c.logging.filePath = v; },
	'logging.write_to_file': (c, v) => { c.logging.writeToFile = v === 'true'; },
	'database.file_path': (c, v) => { c.database.filePath = v; },
	'web_server.port': (c, v) => { c.webServer.port = parseInt(v, 10); },
	'web_server.origin': (c, v) => { c.webServer.origin = v; }
};

/**
 * Apply a batch of flat key-value updates, write them to the config file,
 * and hot-reload the in-memory cache. Returns the full settings map.
 */
export async function updateSettings(
	updates: Record<string, string>,
	_ctx: ServiceContext
): Promise<Record<string, string>> {
	const unknownKeys = Object.keys(updates).filter((k) => !(k in KEY_MAP));
	if (unknownKeys.length > 0) {
		throw new ServiceError(
			400,
			'INVALID_SETTING_KEY',
			`Unknown setting key(s): ${unknownKeys.join(', ')}`
		);
	}

	// Get a mutable deep copy of the current config
	const cfg: TimmyLineConfig = JSON.parse(JSON.stringify(getConfig()));

	for (const [k, v] of Object.entries(updates)) {
		KEY_MAP[k](cfg, v);
	}

	// Persist to disk & hot-reload the in-memory cache
	writeConfigFile(cfg);
	reloadConfig();

	return getSettingsMap();
}
