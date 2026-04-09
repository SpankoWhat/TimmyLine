import { browser } from '$app/environment';
import { writable, type Writable } from 'svelte/store';
import {
	getDefaultTimePreferences,
	sanitizeTimePreferences,
	type TimeDisplayPreferences
} from '$lib/utils/dateTime';

export const TIME_PREFERENCES_STORAGE_KEY = 'timmyline:time-preferences';

export type TimePreferencesStore = Writable<TimeDisplayPreferences> & {
	patch: (partial: Partial<TimeDisplayPreferences>) => void;
	reset: () => void;
};

function loadStoredPreferences(defaults: TimeDisplayPreferences): TimeDisplayPreferences {
	if (!browser) {
		return defaults;
	}

	const raw = localStorage.getItem(TIME_PREFERENCES_STORAGE_KEY);
	if (!raw) {
		return defaults;
	}

	try {
		return sanitizeTimePreferences(JSON.parse(raw), defaults);
	} catch {
		return defaults;
	}
}

function createTimePreferencesStore(): TimePreferencesStore {
	const defaults = getDefaultTimePreferences();
	const store = writable<TimeDisplayPreferences>(defaults);

	const set: Writable<TimeDisplayPreferences>['set'] = (value) => {
		store.set(sanitizeTimePreferences(value, defaults));
	};

	const update: Writable<TimeDisplayPreferences>['update'] = (updater) => {
		store.update((current) => sanitizeTimePreferences(updater(current), defaults));
	};

	const patch = (partial: Partial<TimeDisplayPreferences>) => {
		store.update((current) => sanitizeTimePreferences({ ...current, ...partial }, defaults));
	};

	const reset = () => {
		store.set(getDefaultTimePreferences());
	};

	if (browser) {
		store.set(loadStoredPreferences(defaults));
		store.subscribe((value) => {
			localStorage.setItem(TIME_PREFERENCES_STORAGE_KEY, JSON.stringify(sanitizeTimePreferences(value, defaults)));
		});
	}

	return {
		subscribe: store.subscribe,
		set,
		update,
		patch,
		reset
	};
}

export const timePreferences = createTimePreferencesStore();

export const defaultTimePreferences: TimeDisplayPreferences = getDefaultTimePreferences();

export function updateTimePreferences(partial: Partial<TimeDisplayPreferences>): void {
	timePreferences.patch(partial);
}

export function resetTimePreferences(): void {
	timePreferences.reset();
}
