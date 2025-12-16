import { get } from 'svelte/store';
import type { EntityModalHandler } from '../types';
import { entityFieldConfigs } from '$lib/config/modalFields';
import { 
    currentSelectedIncident, 
    relationTypes,
    currentCachedActions,
    currentCachedEvents
} from '$lib/stores/cacheStore';

export const actionEventsHandler: EntityModalHandler = {
    fields: entityFieldConfigs.action_events,
    fields: entityFieldConfigs.action_events,
    
    getEnrichedFields: () => {
        return entityFieldConfigs.action_events.map(field => {
        return entityFieldConfigs.action_events.map(field => {
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
                    options: get(currentCachedActions).map(a => ({
                        value: a.uuid,
                        label: `${a.action_type} - ${a.notes || 'No notes'}`
                    options: get(currentCachedActions).map(a => ({
                        value: a.uuid,
                        label: `${a.action_type} - ${a.notes || 'No notes'}`
                    }))
                };
            }

            // Fetch events based on the current incident
            // Fetch events based on the current incident
            if (field.key === 'event_uuid') {
                return {
                    ...field,
                    options: get(currentCachedEvents).map(e => ({
                        value: e.uuid,
                        label: `${e.event_type} - ${e.event_data}`
                    options: get(currentCachedEvents).map(e => ({
                        value: e.uuid,
                        label: `${e.event_type} - ${e.event_data}`
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
            ? '/api/create/junction/action_events'
            : '/api/update/junction/action_events';

        data.incident_id = get(currentSelectedIncident)?.uuid;
        
        const response = await fetch(endpoint, {
            method: mode === 'create' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Failed to ${mode} action-event relationship`);
        }

        const result = await response.json();
        return { entity: result };
    }
};
