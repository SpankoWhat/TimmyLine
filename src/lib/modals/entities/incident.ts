/**
 * Incident modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';

export const incidentHandler: EntityModalHandler = {
	fields: entityFieldConfigs.incident,
	
	getEnrichedFields: () => {
		// Incident fields don't need enrichment
		return entityFieldConfigs.incident;
	},
	
	prepareData: (formData, mode) => {
		// Incidents don't need additional context from stores
		return {
			...formData
		};
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create' 
			? '/api/create/core/incident'
			: `/api/update/core/incident/${data.uuid}`;
		
		const response = await fetch(endpoint, {
			method: mode === 'create' ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to ${mode} incident`);
		}
		
		const entity = await response.json();
		return { entity };
	}
};
