/**
 * Incident modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { submitToApi } from '../helpers';

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
			: '/api/update/core/incident';
		
		const entity = await submitToApi(endpoint, data, mode as 'create' | 'edit');
		return { entity };
	}
};
