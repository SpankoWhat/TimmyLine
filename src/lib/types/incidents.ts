/**
 * Type interfaces for incident CRUD operations.
 */

export interface ListIncidentsParams {
	uuid?: string;
	soar_ticket_id?: string;
	title?: string;
	status?: string;
	priority?: string;
	created_at?: number;
	updated_at?: number;
	include_deleted?: boolean;
}

export interface CreateIncidentData {
	title: string;
	status: string;
	priority: string;
	soar_ticket_id?: string;
}

export interface UpdateIncidentData {
	uuid: string;
	title?: string;
	status?: string;
	priority?: string;
	soar_ticket_id?: string;
}

export interface DeleteIncidentData {
	uuid: string;
}

/** Row shape returned by the API (mirrors incidents DB table) */
export interface Incident {
	uuid: string;
	soar_ticket_id: string | null;
	title: string;
	status: string;
	priority: string;
	created_at: number | null;
	updated_at: number | null;
	deleted_at: number | null;
}
