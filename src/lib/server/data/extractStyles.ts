/**
 * CSS Style Extraction Utility for Export Templates
 *
 * Reads `src/app.css` at server runtime and returns the full CSS content.
 * This ensures the exported HTML always uses the current design tokens
 * without any manual synchronization.
 *
 * Since this runs server-side only (`$lib/server/`), using `fs` is safe.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Cached CSS content — read once per process lifetime */
let _cachedAppCss: string | null = null;

/**
 * Returns the full contents of `src/app.css`.
 *
 * The file is read once and cached for the lifetime of the process.
 * This avoids repeated disk I/O on every export call.
 */
export function getAppCss(): string {
	if (_cachedAppCss !== null) {
		return _cachedAppCss;
	}

	try {
		// Resolve path relative to this file:
		// this file:     src/lib/server/data/extractStyles.ts
		// target:        src/app.css
		const thisDir = dirname(fileURLToPath(import.meta.url));
		const appCssPath = resolve(thisDir, '../../../app.css');

		_cachedAppCss = readFileSync(appCssPath, 'utf-8');
		return _cachedAppCss;
	} catch (err) {
		console.error('[extractStyles] Failed to read app.css, using fallback:', err);
		// Return a minimal fallback so exports still work even if path resolution fails
		return getFallbackCss();
	}
}

/**
 * Invalidate the cached CSS (useful for development hot-reload scenarios).
 */
export function invalidateCssCache(): void {
	_cachedAppCss = null;
}

/**
 * Minimal fallback CSS in case `app.css` cannot be read.
 * Contains only the most essential tokens so the export is still usable.
 */
function getFallbackCss(): string {
	return `
:root {
	--bg-root: 0 0% 6.7%;
	--bg-surface-75: 0 0% 8.6%;
	--bg-surface-100: 0 0% 10.2%;
	--bg-surface-200: 0 0% 11.8%;
	--bg-surface-300: 0 0% 14.1%;
	--bg-surface-400: 0 0% 16.5%;
	--bg-overlay: 0 0% 12.5%;
	--bg-overlay-hover: 0 0% 16.5%;
	--bg-muted: 0 0% 12.5%;
	--bg-control: 0 0% 10.2%;
	--bg-alternative: 0 0% 5.5%;
	--fg-default: 40 7% 93%;
	--fg-light: 30 5% 64%;
	--fg-lighter: 25 4% 48%;
	--fg-muted: 20 3% 28%;
	--fg-contrast: 0 0% 8%;
	--fg-data: 40 5% 88%;
	--border-default: 20 3% 16%;
	--border-muted: 20 2% 12%;
	--border-strong: 20 3% 20%;
	--brand-default: 36 100% 50%;
	--brand-600: 38 100% 65%;
	--brand-link: 36 95% 55%;
	--info-default: 210 70% 55%;
	--warning-default: 45 100% 50%;
	--success-default: 142 70% 45%;
	--destructive-default: 0 72% 51%;
	--severity-critical: 0 85% 55%;
	--severity-critical-bg: 0 40% 12%;
	--severity-critical-border: 0 60% 25%;
	--severity-high: 25 95% 55%;
	--severity-high-bg: 25 40% 12%;
	--severity-high-border: 25 55% 25%;
	--severity-medium: 45 100% 50%;
	--severity-medium-bg: 45 35% 12%;
	--severity-medium-border: 45 50% 22%;
	--severity-low: 210 70% 55%;
	--severity-low-bg: 210 30% 12%;
	--severity-low-border: 210 40% 22%;
	--severity-info: 0 0% 55%;
	--severity-info-bg: 0 0% 12%;
	--severity-info-border: 0 0% 22%;
	--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
	--text-2xs: 0.6875rem;
	--text-xs: 0.75rem;
	--text-sm: 0.875rem;
	--text-base: 1rem;
	--text-lg: 1.125rem;
	--text-xl: 1.25rem;
	--font-normal: 400;
	--font-medium: 500;
	--font-semibold: 600;
	--font-bold: 700;
	--leading-none: 1;
	--leading-tight: 1.25;
	--leading-snug: 1.375;
	--leading-normal: 1.5;
	--tracking-wide: 0.025em;
	--tracking-mono: 0.02em;
	--space-0\\.5: 0.125rem;
	--space-1: 0.25rem;
	--space-1\\.5: 0.375rem;
	--space-2: 0.5rem;
	--space-3: 0.75rem;
	--space-4: 1rem;
	--space-6: 1.5rem;
	--space-8: 2rem;
	--space-10: 2.5rem;
	--border-width: 1px;
	--border-width-thick: 2px;
	--radius-xs: 2px;
	--radius-sm: 4px;
	--radius-md: 6px;
	--radius-lg: 8px;
	--radius-xl: 12px;
	--radius-full: 9999px;
	--shadow-lg: 0 10px 15px -3px hsl(0 0% 0% / 0.5), 0 4px 6px -4px hsl(0 0% 0% / 0.4);
	--duration-normal: 150ms;
	--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { font-size: 14px; }
body {
	font-family: var(--font-family);
	color: hsl(var(--fg-default));
	background: hsl(var(--bg-root));
	line-height: var(--leading-normal);
	-webkit-font-smoothing: antialiased;
}
.mono { font-family: var(--font-mono); letter-spacing: var(--tracking-mono); }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: hsl(var(--bg-surface-75)); }
::-webkit-scrollbar-thumb { background: hsl(var(--border-strong)); border-radius: var(--radius-sm); }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--fg-muted)); }
`;
}
