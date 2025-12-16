import { get } from 'svelte/store';
import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { 
    currentCachedEntities,
    currentCachedEvents,
    currentSelectedIncident,
    relationTypes
} from '$lib/stores/cacheStore';

export const eventEntitiesHandler: EntityModalHandler = {
    fields: entityFieldConfigs.event_entities,
    
    getEnrichedFields: () => {
        return entityFieldConfigs.event_entities.map(field => {
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
                    options: get(currentCachedEvents).map(e => ({
                        value: e.uuid,
                        label: `${e.event_type} - ${e.event_data}`
                    }))
                };
            }

            // Fetch entities based on the current incident
            if (field.key === 'entity_uuid') {
                return {
                    ...field,
                    options: get(currentCachedEntities).map(ent => ({
                        value: ent.uuid,
                        label: `${ent.entity_type} - ${ent.identifier}`
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
            ? '/api/create/junction/event_entities'
            : '/api/update/junction/event_entities';

        data.incident_id = get(currentSelectedIncident)?.uuid;
        
        const response = await fetch(endpoint, {
            method: mode === 'create' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to ${mode} event-entity relationship`);
        }

        const result = await response.json();
        return { entity: result };
    }
};
