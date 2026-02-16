/**
 * Timeline Event modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { get } from 'svelte/store';
import { currentSelectedAnalyst, currentSelectedIncident, eventTypes } from '$lib/stores/cacheStore';

export const timelineEventHandler: EntityModalHandler = {
	fields: entityFieldConfigs.timeline_event,
	
	getEnrichedFields: () => {
		return entityFieldConfigs.timeline_event.map(field => {
			if (field.key === 'event_type') {
				return {
					...field,
					options: get(eventTypes).map(et => ({
						value: et.name,
						label: et.name
					}))
				};
			}
			return field;
		});
	},
	
	prepareData: (formData, mode) => {
		const incident = get(currentSelectedIncident);
		const analyst = get(currentSelectedAnalyst);
		
		return {
			...formData,
			incident_id: incident?.uuid,
			discovered_by: analyst?.uuid,
			// Convert datetime fields to epoch timestamps (seconds)
			occurred_at: formData.occurred_at ? Math.floor(new Date(formData.occurred_at).getTime() / 1000) : null,
			discovered_at: formData.discovered_at ? Math.floor(new Date(formData.discovered_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
		};
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create'
			? '/api/create/core/timeline_event'
			: '/api/update/core/timeline_event';
		
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to ${mode} timeline event`);
		}
		
		const entity = await response.json();
		return { entity };
	},
	
	validate: (formData) => {
		const errors: Record<string, string> = {};
		
		// Ensure discovered_at is not in the future
		if (formData.discovered_at) {
			const discoveredTime = new Date(formData.discovered_at).getTime();
			if (discoveredTime > Date.now()) {
				errors.discovered_at = 'Discovery time cannot be in the future';
			}
		}
		
		return Object.keys(errors).length > 0 ? errors : null;
	}
};
