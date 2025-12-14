import { get } from 'svelte/store';
import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { 
    currentSelectedAnalyst, 
    currentSelectedIncident, 
    relationTypes,
    currentCachedActions,
    currentCachedEvents
} from '$lib/stores/cacheStore';

export const actionEventsHandler: EntityModalHandler = {
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
            if (field.key === 'event_uuid') {
                return {
                    ...field,
                    options: get(currentCachedEvents).map(rt =>({
                        value: rt.uuid,
                        label: `${rt.event_type} - ${rt.event_data}`
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
