/**
 * Field Preferences Persistence Utility
 * 
 * Handles saving/loading user field selector preferences to/from localStorage.
 * Used by both FieldSelectorPanel (for live save/load) and the incident page
 * (to hydrate initial state before the panel mounts).
 */

import type { DisplayField } from '$lib/config/displayFieldsConfig';

type StoredFieldPref = {
	key: string;
	pinned: boolean;
	order: number;
	// Extra metadata stored for dynamic fields so they can be reconstructed
	isDynamic?: boolean;
	parentKey?: string;
	label?: string;
};

/** Build the localStorage key for a given panel type */
export function getFieldPrefsKey(type: 'event' | 'action'): string {
	return `timmyline:fieldPrefs:${type}`;
}

/** Convert a key like 'source_ip' to 'Source Ip' */
function keyToLabel(key: string): string {
	return key
		.replace(/_/g, ' ')
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Save field preferences to localStorage */
export function saveFieldPreferences(type: 'event' | 'action', fields: DisplayField[]): void {
	try {
		const prefs: StoredFieldPref[] = fields.map(f => {
			const pref: StoredFieldPref = {
				key: f.key,
				pinned: f.pinned,
				order: f.order,
			};
			// Store extra metadata for dynamic fields so they can be reconstructed
			if (f.isDynamic) {
				pref.isDynamic = true;
				pref.parentKey = f.parentKey;
				pref.label = f.label;
			}
			return pref;
		});
		localStorage.setItem(getFieldPrefsKey(type), JSON.stringify(prefs));
	} catch {
		// Silently ignore — storage might be full or unavailable
	}
}

/** Load stored preferences and apply them onto a base field config.
 *  Also reconstructs any stored dynamic fields that aren't in baseFields. */
export function loadFieldPreferences(type: 'event' | 'action', baseFields: DisplayField[]): DisplayField[] {
	try {
		const raw = localStorage.getItem(getFieldPrefsKey(type));
		if (!raw) return baseFields.map(f => ({ ...f }));
		const prefs: StoredFieldPref[] = JSON.parse(raw);
		const prefMap = new Map(prefs.map(p => [p.key, p]));
		const baseKeys = new Set(baseFields.map(f => f.key));

		// Apply stored prefs to static base fields
		const result: DisplayField[] = baseFields.map(f => {
			const saved = prefMap.get(f.key);
			if (saved) {
				return { ...f, pinned: saved.pinned, order: saved.order };
			}
			return { ...f };
		});

		// Reconstruct any stored dynamic fields that aren't in baseFields
		for (const pref of prefs) {
			if (!baseKeys.has(pref.key)) {
				// Either explicitly marked as dynamic, or infer from key containing '.'
				const isDynamic = pref.isDynamic || pref.key.includes('.');
				if (isDynamic) {
					const parts = pref.key.split('.');
					result.push({
						key: pref.key,
						label: pref.label || keyToLabel(parts.pop() || pref.key),
						pinned: pref.pinned,
						order: pref.order,
						showInNote: false,
						isDynamic: true,
						parentKey: pref.parentKey || parts.join('.'),
					});
				}
			}
		}

		return result;
	} catch {
		return baseFields.map(f => ({ ...f }));
	}
}

/** Clear stored preferences for a given panel type */
export function clearFieldPreferences(type: 'event' | 'action'): void {
	try {
		localStorage.removeItem(getFieldPrefsKey(type));
	} catch {
		// ignore
	}
}
