/**
 * Investigation Action modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { get } from 'svelte/store';
import { currentSelectedAnalyst, currentSelectedIncident, actionTypes } from '$lib/stores/cacheStore';

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
		const incident = get(currentSelectedIncident);
		const analyst = get(currentSelectedAnalyst);
		
		return {
			...formData,
			incident_id: incident?.uuid,
			actioned_by: analyst?.uuid,
			// Convert datetime field to epoch timestamp
			performed_at: formData.performed_at ? new Date(formData.performed_at).getTime() : Date.now(),
		};
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create'
			? '/api/create/core/investigation_action'
			: '/api/update/core/investigation_action';
		
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to ${mode} investigation action`);
		}
		
		const entity = await response.json();
		return { entity };
	}
};
