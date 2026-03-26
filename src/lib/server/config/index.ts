/**
 * TimmyLine Application Configuration
 *
 * Reads infrastructure settings from a JSON config file on disk.  These are
 * settings that the application needs **at boot time** (logging paths, auth
 * provider toggles) — they live outside the database so the app can read them
 * before any DB initialisation.
 *
 * The config file path defaults to `timmyline.config.json` in the project
 * root.  Override with the `TIMMYLINE_CONFIG` env var.
 *
 * Usage:
 *   import { getConfig, reloadConfig } from '$lib/server/config';
 *   const cfg = getConfig();
 *   cfg.logging.writeToFile; // boolean
 *
 * Hot-reload:
 *   After the admin API writes an updated config file, call `reloadConfig()`
 *   so that per-request checks (e.g. API-key auth toggle) pick up the change
 *   without a full server restart. Settings consumed only at module-init time
 *   (e.g. Auth.js providers, logger file path) still require a restart.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

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
	auth: {
		google: { enabled: boolean };
		microsoft: { enabled: boolean };
		github: { enabled: boolean };
		apiKeys: { enabled: boolean };
	};
}

// ────────────────────────────────────────────────────────────────────────────
// Defaults
// ────────────────────────────────────────────────────────────────────────────

const DEFAULTS: TimmyLineConfig = {
	logging: {
		filePath: './data/timmyLine.log',
		writeToFile: false
	},
	auth: {
		google: { enabled: true },
		microsoft: { enabled: true },
		github: { enabled: true },
		apiKeys: { enabled: true }
	}
};

// ────────────────────────────────────────────────────────────────────────────
// Resolution helpers
// ────────────────────────────────────────────────────────────────────────────

/** Resolve the config file path (env override or project-root default). */
function resolveConfigPath(): string {
	return resolve(process.env.TIMMYLINE_CONFIG || 'timmyline.config.json');
}

/**
 * Deep-merge `partial` onto `base`, returning a new object.
 * Only merges plain objects; arrays and primitives overwrite.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(base: any, partial: any): any {
	const out: Record<string, unknown> = { ...base };
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
// Read / write
// ────────────────────────────────────────────────────────────────────────────

function readConfigFile(): TimmyLineConfig {
	const filePath = resolveConfigPath();

	if (!existsSync(filePath)) {
		// No config file yet — use defaults
		return structuredClone(DEFAULTS);
	}

	try {
		const raw = readFileSync(filePath, 'utf-8');
		const parsed = JSON.parse(raw);
		return deepMerge(DEFAULTS, parsed) as TimmyLineConfig;
	} catch {
		console.error(`[config] Failed to parse ${filePath} — falling back to defaults`);
		return structuredClone(DEFAULTS);
	}
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
