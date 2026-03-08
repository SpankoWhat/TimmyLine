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

/** Row shape returned by the API (mirrors timeline_events DB table) */
export interface TimelineEvent {
	uuid: string;
	incident_id: string;
	event_type: string;
	discovered_by: string;
	discovered_at: number;
	occurred_at: number | null;
	notes: string | null;
	event_data: string | null;
	severity: string | null;
	confidence: string | null;
	source_reliability: string | null;
	source: string | null;
	tags: string | null;
	created_at: number | null;
	updated_at: number | null;
	deleted_at: number | null;
}
