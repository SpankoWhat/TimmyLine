/**
 * Analyst modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { submitToApi } from '../helpers';

export const analystHandler: EntityModalHandler = {
	fields: entityFieldConfigs.analyst,
	
	getEnrichedFields: () => {
		// Analyst fields don't need enrichment
		return entityFieldConfigs.analyst;
	},
	
	prepareData: (formData, mode) => {
		// Analysts don't need additional context
		return {
			...formData
		};
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create'
			? '/api/create/core/analyst'
			: '/api/update/core/analyst';
		
		const entity = await submitToApi(endpoint, data, mode as 'create' | 'edit');
		return { entity };
	}
};
