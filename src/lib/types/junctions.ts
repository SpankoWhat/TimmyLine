/**
 * Type interfaces for junction table (many-to-many relationship) operations.
 */

import type { JunctionTableName } from './common';

export interface CreateEventEntityData {
	event_uuid: string;
	entity_uuid: string;
	role?: string;
	context?: string;
	incident_id?: string;
}

export interface CreateActionEventData {
	action_uuid: string;
	event_uuid: string;
	relation_type: string;
	incident_id?: string;
}

export interface CreateActionEntityData {
	action_uuid: string;
	entity_uuid: string;
	relation_type: string;
	incident_id: string;
}

export interface UpdateEventEntityData {
	event_id: string;
	entity_id: string;
	role?: string;
}

export interface UpdateActionEventData {
	action_id: string;
	event_id: string;
	relation_type?: string;
}

export interface UpdateActionEntityData {
	action_id: string;
	entity_id: string;
	relation_type?: string;
}

export interface DeleteJunctionData {
	table: JunctionTableName;
	action_id?: string;
	event_id?: string;
	entity_id?: string;
	annotation_id?: string;
	reference_id?: string;
	reference_type?: string;
}

/** Row shape for event_entities junction */
export interface EventEntity {
	event_id: string;
	entity_id: string;
	role: string | null;
	context: string | null;
	created_at: number | null;
}

/** Row shape for action_events junction */
export interface ActionEvent {
	action_id: string;
	event_id: string;
	relation_type: string;
	created_at: number | null;
}

/** Row shape for action_entities junction */
export interface ActionEntity {
	action_id: string;
	entity_id: string;
	relation_type: string;
	incident_id: string;
	created_at: number | null;
}
