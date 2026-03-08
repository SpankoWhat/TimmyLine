/**
 * Type interfaces for investigation action CRUD operations.
 */

export interface ListInvestigationActionsParams {
	uuid?: string;
	action_type?: string;
	incident_id?: string;
	tags?: string;
	actioned_by?: string;
	performed_at?: number;
	action_data?: string;
	result?: string;
	tool_used?: string;
	notes?: string;
	next_steps?: string;
	include_deleted?: boolean;
}

export interface CreateInvestigationActionData {
	incident_id: string;
	actioned_by: string;
	action_type: string;
	performed_at: number;
	action_data?: string;
	result?: string;
	tool_used?: string;
	notes?: string;
	next_steps?: string;
	tags?: string;
}

export interface UpdateInvestigationActionData {
	uuid: string;
	incident_id?: string;
	actioned_by?: string;
	action_type?: string;
	performed_at?: number;
	action_data?: string;
	result?: string;
	tool_used?: string;
	notes?: string;
	next_steps?: string;
	tags?: string;
}

export interface DeleteInvestigationActionData {
	uuid: string;
	incident_id?: string;
}

/** Row shape returned by the API (mirrors investigation_actions DB table) */
export interface InvestigationAction {
	uuid: string;
	incident_id: string;
	action_type: string;
	actioned_by: string;
	performed_at: number;
	action_data: string | null;
	result: string | null;
	tool_used: string | null;
	notes: string | null;
	next_steps: string | null;
	tags: string | null;
	created_at: number | null;
	updated_at: number | null;
	deleted_at: number | null;
}
