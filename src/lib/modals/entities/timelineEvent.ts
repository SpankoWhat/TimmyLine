import { createEntityHandler } from '../helpers';
import { eventTypes } from '$lib/stores/cacheStore';

export const timelineEventHandler = createEntityHandler({
	entityKey: 'timeline_event',
	apiPath: 'core/timeline_event',
	analystKey: 'discovered_by',
	storeEnrichments: { event_type: eventTypes },
	epochFields: [
		{ key: 'occurred_at' },
		{ key: 'discovered_at', defaultToNow: true },
	],
	validate: (formData) => {
		const errors: Record<string, string> = {};

		if (formData.discovered_at) {
			const discoveredTime = new Date(formData.discovered_at).getTime();
			if (discoveredTime > Date.now()) {
				errors.discovered_at = 'Discovery time cannot be in the future';
			}
		}

		return Object.keys(errors).length > 0 ? errors : null;
	}
});
