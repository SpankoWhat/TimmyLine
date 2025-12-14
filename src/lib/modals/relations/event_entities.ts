import { get } from 'svelte/store';
import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { 
    currentSelectedAnalyst, 
    currentSelectedIncident, 
    relationTypes,
    currentCachedEntities,
    currentCachedEvents
} from '$lib/stores/cacheStore';

export const eventEntitiesHandler: EntityModalHandler = {
    fields: entityFieldConfigs.entity,
    
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

            // Fetch events based on the current incident
            if (field.key === 'event_uuid') {
                return {
                    ...field,
                    options: get(currentCachedEvents).map(rt =>({
                        value: rt.uuid,
                        label: `${rt.event_type} - ${rt.event_data}`
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
        return {};
    }
};
