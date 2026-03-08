/**
 * Type interfaces for entity CRUD operations.
 */

export interface ListEntitiesParams {
	uuid?: string;
	incident_id?: string;
	entered_by?: string;
	entity_type?: string;
	created_at?: number;
	updated_at?: number;
	first_seen?: number;
	last_seen?: number;
	identifier?: string;
	display_name?: string;
	attributes?: string;
	status?: string;
	criticality?: string;
	tags?: string;
	include_deleted?: boolean;
}

export interface CreateEntityData {
	incident_id: string;
	entered_by: string;
	entity_type: string;
	identifier: string;
	display_name?: string;
	status?: string;
	criticality?: string;
	first_seen?: number;
	last_seen?: number;
	attributes?: string;
	tags?: string;
}

export interface UpdateEntityData {
	uuid: string;
	incident_id?: string;
	entered_by?: string;
	entity_type?: string;
	identifier?: string;
	display_name?: string;
	status?: string;
	criticality?: string;
	first_seen?: number;
	last_seen?: number;
	attributes?: string;
	tags?: string;
}

export interface DeleteEntityData {
	uuid: string;
	incident_id?: string;
}
