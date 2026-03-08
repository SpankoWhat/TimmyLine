/**
 * Analyst parameter types — shared between service layer, API routes, and MCP tools.
 */

export interface ListAnalystsParams {
	uuid?: string;
	username?: string;
	full_name?: string;
	role?: string;
	active?: boolean;
	created_at?: number;
	updated_at?: number;
	include_deleted?: boolean;
}

export interface CreateAnalystData {
	username: string;
	full_name?: string;
	role?: string;
	active?: boolean;
}

export interface UpdateAnalystData {
	uuid: string;
	username?: string;
	full_name?: string;
	role?: string;
	active?: boolean;
}

export interface DeleteAnalystData {
	uuid: string;
}
