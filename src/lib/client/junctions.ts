/**
 * Client SDK — Junction table resources (many-to-many relationships)
 * Usage: import { eventEntities, actionEvents, actionEntities } from '$lib/client'
 */
import { apiFetch } from './base';
import type {
	CreateEventEntityData,
	CreateActionEventData,
	CreateActionEntityData,
	UpdateEventEntityData,
	UpdateActionEventData,
	UpdateActionEntityData,
	EventEntity,
	ActionEvent,
	ActionEntity
} from '$lib/types';

export const eventEntities = {
	/** Link an entity to a timeline event */
	create(data: CreateEventEntityData): Promise<EventEntity> {
		return apiFetch<EventEntity>('POST', '/api/event-entities', { body: data });
	},

	/** Update the relationship between an entity and event */
	update(data: UpdateEventEntityData): Promise<EventEntity> {
		return apiFetch<EventEntity>('PATCH', '/api/event-entities', { body: data });
	},

	/** Remove the link between an entity and event */
	delete(event_id: string, entity_id: string): Promise<void> {
		return apiFetch<void>('DELETE', '/api/event-entities', {
			body: { table: 'event_entities', event_id, entity_id }
		});
	}
};

export const actionEvents = {
	/** Link a timeline event to an investigation action */
	create(data: CreateActionEventData): Promise<ActionEvent> {
		return apiFetch<ActionEvent>('POST', '/api/action-events', { body: data });
	},

	/** Update the relationship between an action and event */
	update(data: UpdateActionEventData): Promise<ActionEvent> {
		return apiFetch<ActionEvent>('PATCH', '/api/action-events', { body: data });
	},

	/** Remove the link between an action and event */
	delete(action_id: string, event_id: string): Promise<void> {
		return apiFetch<void>('DELETE', '/api/action-events', {
			body: { table: 'action_events', action_id, event_id }
		});
	}
};

export const actionEntities = {
	/** Link an entity to an investigation action */
	create(data: CreateActionEntityData): Promise<ActionEntity> {
		return apiFetch<ActionEntity>('POST', '/api/action-entities', { body: data });
	},

	/** Update the relationship between an action and entity */
	update(data: UpdateActionEntityData): Promise<ActionEntity> {
		return apiFetch<ActionEntity>('PATCH', '/api/action-entities', { body: data });
	},

	/** Remove the link between an action and entity */
	delete(action_id: string, entity_id: string): Promise<void> {
		return apiFetch<void>('DELETE', '/api/action-entities', {
			body: { table: 'action_entities', action_id, entity_id }
		});
	}
};
