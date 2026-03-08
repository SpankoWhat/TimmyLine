/**
 * Type interfaces for timeline event CRUD operations.
 */

export interface ListTimelineEventsParams {
	uuid?: string;
	incident_id?: string;
	discovered_by?: string;
	event_type?: string;
	occurred_at?: number;
	discovered_at?: number;
	created_at?: number;
	updated_at?: number;
	notes?: string;
	event_data?: string;
	severity?: string;
	confidence?: string;
	source_reliability?: string;
	source?: string;
	tags?: string;
	include_deleted?: boolean;
}

export interface CreateTimelineEventData {
	incident_id: string;
	discovered_by: string;
	event_type: string;
	discovered_at: number;
	event_data: string;
	occurred_at?: number;
	notes?: string;
	severity?: string;
	confidence?: string;
	source_reliability?: string;
	source?: string;
	tags?: string;
}

export interface UpdateTimelineEventData {
	uuid: string;
	incident_id?: string;
	discovered_by?: string;
	event_type?: string;
	discovered_at?: number;
	occurred_at?: number;
	notes?: string;
	event_data?: string;
	severity?: string;
	confidence?: string;
	source_reliability?: string;
	source?: string;
	tags?: string;
}

export interface DeleteTimelineEventData {
	uuid: string;
	incident_id?: string;
}
