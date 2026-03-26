/**
 * Admin Settings Types
 *
 * Shared request/response interfaces for the admin settings API.
 * Importable from both client and server code via '$lib/types'.
 */

/** All app settings as a flat key-value map */
export interface AppSettingsMap {
	[key: string]: string;
}

/** Request body for PATCH /api/admin/settings */
export interface UpdateSettingsRequest {
	settings: Record<string, string>;
}

/** Response from GET /api/admin/settings */
export interface SettingsResponse {
	settings: AppSettingsMap;
}
