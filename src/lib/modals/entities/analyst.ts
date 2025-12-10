/**
 * Analyst modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';

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
			: `/api/update/core/analyst/${data.uuid}`;
		
		const response = await fetch(endpoint, {
			method: mode === 'create' ? 'POST' : 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to ${mode} analyst`);
		}
		
		const entity = await response.json();
		return { entity };
	}
};
