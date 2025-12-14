import { get } from 'svelte/store';
import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { 
    currentSelectedAnalyst, 
    currentSelectedIncident, 
    relationTypes,
    currentCachedActions,
    currentCachedEntities
} from '$lib/stores/cacheStore';

export const actionEntitiesHandler: EntityModalHandler = {
    fields: entityFieldConfigs.action_entities,
	
	getEnrichedFields: () => {
        return entityFieldConfigs.action_entities.map(field => {
            // Fetch relation types
            if (field.key === 'relation_type') {
                return {
                    ...field,
                    options: get(relationTypes).map(rt =>({
                        value: rt.name,
                        label: rt.name.replace(/_/g, ' ')
                    }))
                };
            }

            // Fetch action based on the current incident
            if (field.key === 'action_uuid') {
                return {
                    ...field,
                    options: get(currentCachedActions).map(rt =>({
                        value: rt.uuid,
                        label: `${rt.action_type} - ${rt.notes}`
                    }))
                };
            }

            // Fetch entity based on the current incident
            if (field.key === 'entity_uuid') {
                return {
                    ...field,
                    options: get(currentCachedEntities).map(rt =>({
                        value: rt.uuid,
                        label: `${rt.entity_type} - ${rt.identifier}`
                    }))
                };
            }


            return field;
        });
	},
	
	prepareData: (formData, mode) => {
        return formData;
	},
	
    submit: async (data, mode) => {
        const endpoint = mode === 'create'
            ? '/api/create/junction/action_entities'
            : '/api/update/junction/action_entities';

        const response = await fetch(endpoint, {
            method: mode === 'create' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to ${mode} action-entity relationship`);
        }

        const result = await response.json();
        return { entity: result };
    }
};
