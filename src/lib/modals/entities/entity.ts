/**
 * Entity modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { get } from 'svelte/store';
import { entityTypes } from '$lib/stores/cacheStore';
import { submitToApi, addIncidentContext } from '../helpers';

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
		const enriched = addIncidentContext(formData, 'entered_by');
		return {
			...enriched,
			// Convert datetime fields to epoch timestamps (seconds)
			first_seen: formData.first_seen ? Math.floor(new Date(formData.first_seen).getTime() / 1000) : null,
			last_seen: formData.last_seen ? Math.floor(new Date(formData.last_seen).getTime() / 1000) : null,
		};
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create'
			? '/api/create/core/entity'
			: '/api/update/core/entity';
		
		const entity = await submitToApi(endpoint, data, mode as 'create' | 'edit');
		return { entity };
	}
};
