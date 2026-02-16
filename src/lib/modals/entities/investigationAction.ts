/**
 * Investigation Action modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { get } from 'svelte/store';
import { actionTypes } from '$lib/stores/cacheStore';
import { submitToApi, addIncidentContext } from '../helpers';

export const investigationActionHandler: EntityModalHandler = {
	fields: entityFieldConfigs.investigation_action,
	
	getEnrichedFields: () => {
		return entityFieldConfigs.investigation_action.map(field => {
			if (field.key === 'action_type') {
				return {
					...field,
					options: get(actionTypes).map(at => ({
						value: at.name,
						label: at.name
					}))
				};
			}
			return field;
		});
	},
	
	prepareData: (formData, mode) => {
		const enriched = addIncidentContext(formData, 'actioned_by');
		return {
			...enriched,
			// Convert datetime field to epoch timestamp (seconds)
			performed_at: formData.performed_at ? Math.floor(new Date(formData.performed_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
		};
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create'
			? '/api/create/core/investigation_action'
			: '/api/update/core/investigation_action';
		
		const entity = await submitToApi(endpoint, data, mode as 'create' | 'edit');
		return { entity };
	}
};
