/**
 * Base lookup table handler factory
 * Lookup tables share similar logic, so we create a factory
 */

import type { EntityModalHandler, EntityType } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';

function createLookupHandler(lookupType: EntityType): EntityModalHandler {
	return {
		fields: entityFieldConfigs[lookupType],
		
		getEnrichedFields: () => {
			// Lookup fields don't need enrichment
			return entityFieldConfigs[lookupType];
		},
		
		prepareData: (formData, mode) => {
			// Lookup tables don't need additional context
			return {
				...formData,
				table: lookupType
			};
		},
		
		submit: async (data, mode) => {
			const endpoint = mode === 'create'
				? '/api/create/lookup'
				: `/api/update/lookup`;
			
			const response = await fetch(endpoint, {
				method: mode === 'create' ? 'POST' : 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || `Failed to ${mode} ${lookupType}`);
			}
			
			// For lookup tables, fetch the updated list
			const lookupResponse = await fetch(`/api/read/lookup?table=${data.table}`);
			const lookupData = await lookupResponse.json();
			
			return { lookupData };
		}
	};
}

export const actionTypeHandler = createLookupHandler('action_type');
export const entityTypeHandler = createLookupHandler('entity_type');
export const eventTypeHandler = createLookupHandler('event_type');
export const annotationTypeHandler = createLookupHandler('annotation_type');
