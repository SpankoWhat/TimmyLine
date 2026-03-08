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
