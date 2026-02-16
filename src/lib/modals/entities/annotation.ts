/**
 * Annotation modal handler
 */

import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { get } from 'svelte/store';
import { annotationTypes } from '$lib/stores/cacheStore';
import { submitToApi, addIncidentContext } from '../helpers';

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
		return addIncidentContext(formData, 'noted_by');
	},
	
	submit: async (data, mode) => {
		const endpoint = mode === 'create'
			? '/api/create/core/annotation'
			: '/api/update/core/annotation';
		
		const entity = await submitToApi(endpoint, data, mode as 'create' | 'edit');
		return { entity };
	}
};
