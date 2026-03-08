/**
 * Client SDK — API Keys resource
 * Requires active session (browser-only; not accessible via API key auth).
 * Usage: import { apiKeys } from '$lib/client'
 */
import { apiFetch } from './base';

export interface ApiKeyRow {
	id: string;
	key_prefix: string;
	name: string;
	role: string;
	expires_at: number | null;
	created_at: number | null;
	last_used_at: number | null;
	revoked_at: number | null;
}

export interface CreateApiKeyResponse extends ApiKeyRow {
	/** Plaintext key — shown only once at creation */
	key: string;
	message: string;
}

export interface RevokeApiKeyResponse {
	message: string;
	id: string;
	name: string;
	revoked_at: number;
}

export const apiKeys = {
	/** List API keys for the current session user */
	list(): Promise<ApiKeyRow[]> {
		return apiFetch<ApiKeyRow[]>('GET', '/api/api-keys');
	},

	/** Generate a new API key */
	create(data: { name: string; role: string; expires_at?: number }): Promise<CreateApiKeyResponse> {
		return apiFetch<CreateApiKeyResponse>('POST', '/api/api-keys', { body: data });
	},

	/** Revoke an API key by ID */
	revoke(id: string): Promise<RevokeApiKeyResponse> {
		return apiFetch<RevokeApiKeyResponse>('DELETE', '/api/api-keys', { body: { id } });
	}
};
