/**
 * Annotation modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { get } from 'svelte/store';
import { currentSelectedAnalyst, currentSelectedIncident, annotationTypes } from '$lib/stores/cacheStore';

export const annotationHandler: EntityModalHandler = {
	fields: entityFieldConfigs.annotation,
	
	getEnrichedFields: () => {
		return entityFieldConfigs.annotation.map(field => {
			if (field.key === 'annotation_type') {
				return {
					...field,
					options: get(annotationTypes).map(at => ({
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
			noted_by: analyst?.uuid,
		};
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create'
			? '/api/create/core/annotation'
			: '/api/update/core/annotation';
		
		const response = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});
		
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || `Failed to ${mode} annotation`);
		}
		
		const entity = await response.json();
		return { entity };
	}
};
