/**
 * Standalone TimmyLine Config Reader
 *
 * Lightweight config loader that can be imported by ANY script — including
 * ones that run outside of SvelteKit (server.js, migrate.js, drizzle.config.ts,
 * seed.ts).  The SvelteKit config module ($lib/server/config) delegates to
 * this file so there is exactly ONE place that defines defaults and does the
 * deep-merge.
 *
 * Usage:
 *   import { getConfig, resolveConfigPath } from './config.js';
 *   const cfg = getConfig();
 *   cfg.database.filePath;   // "./data/timmyLine.db"
 *   cfg.webServer.port;      // 3000
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ────────────────────────────────────────────────────────────────────────────
// Defaults
// ────────────────────────────────────────────────────────────────────────────

/** @type {import('./src/lib/server/config/index.ts').TimmyLineConfig} */
const DEFAULTS = {
	logging: {
		filePath: './data/timmyLine.log',
		writeToFile: false
	},
	database: {
		filePath: './data/timmyLine.db'
	},
	auth: {
		google: { enabled: true },
		microsoft: { enabled: true },
		github: { enabled: true },
		apiKeys: { enabled: true }
	},
	webServer: {
		port: 3000,
		origin: 'http://localhost'
	}
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Resolve the config file path (env override or project-root default). */
export function resolveConfigPath() {
	return resolve(process.env.TIMMYLINE_CONFIG || 'timmyline.config.json');
}

/**
 * Deep-merge `partial` onto `base`, returning a new object.
 * Only merges plain objects; arrays and primitives overwrite.
 * @param {any} base
 * @param {any} partial
 * @returns {any}
 */
function deepMerge(base, partial) {
	const out = { ...base };
	for (const key of Object.keys(partial)) {
		const baseVal = base[key];
		const partialVal = partial[key];
		if (
			baseVal && partialVal &&
			typeof baseVal === 'object' && !Array.isArray(baseVal) &&
			typeof partialVal === 'object' && !Array.isArray(partialVal)
		) {
			out[key] = deepMerge(baseVal, partialVal);
		} else if (partialVal !== undefined) {
			out[key] = partialVal;
		}
	}
	return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Reader
// ────────────────────────────────────────────────────────────────────────────

/**
 * Read and parse the config file, deep-merging with defaults.
 * Returns a fresh object on every call (no caching — the SvelteKit
 * wrapper in $lib/server/config handles caching for the app).
 */
export function readConfigFile() {
	const filePath = resolveConfigPath();

	if (!existsSync(filePath)) {
		return structuredClone(DEFAULTS);
	}

	try {
		const raw = readFileSync(filePath, 'utf-8');
		const parsed = JSON.parse(raw);
		return deepMerge(DEFAULTS, parsed);
	} catch {
		console.error(`[config] Failed to parse ${filePath} — falling back to defaults`);
		return structuredClone(DEFAULTS);
	}
}

/**
 * Convenience: read the config once and return it.
 * Standalone scripts call this directly. The SvelteKit module adds
 * its own caching and hot-reload layer on top.
 */
export function getConfig() {
	return readConfigFile();
}

export { DEFAULTS as CONFIG_DEFAULTS };
