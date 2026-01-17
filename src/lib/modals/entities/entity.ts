/**
 * Entity modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { get } from 'svelte/store';
import { currentSelectedAnalyst, currentSelectedIncident, entityTypes } from '$lib/stores/cacheStore';

export const entityHandler: EntityModalHandler = {
	fields: entityFieldConfigs.entity,
	
	getEnrichedFields: () => {
		return entityFieldConfigs.entity.map(field => {
			if (field.key === 'entity_type') {
				return {
					...field,
					options: get(entityTypes).map(et => ({
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
			entered_by: analyst?.uuid,
			// Convert datetime fields to epoch timestamps
			first_seen: formData.first_seen ? new Date(formData.first_seen).getTime() : null,
			last_seen: formData.last_seen ? new Date(formData.last_seen).getTime() : null,
		};
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create'
			? '/api/create/core/entity'
			: '/api/update/core/entity';
		
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to ${mode} entity`);
		}
		
		const entity = await response.json();
		return { entity };
	}
};
