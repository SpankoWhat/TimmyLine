/**
 * Client SDK for admin endpoints.
 * All endpoints require admin role.
 */
import { apiFetch } from './base';
import type { AppSettingsMap } from '$lib/types/admin';

// Re-export for convenience
export type { AppSettingsMap } from '$lib/types/admin';

/** Analyst record as returned by the admin API */
export interface AdminAnalyst {
	uuid: string;
	user_id: string | null;
	username: string;
	email: string | null;
	full_name: string | null;
	role: string | null;
	active: boolean | null;
	created_at: number | null;
	updated_at: number | null;
	deleted_at: number | null;
}

export const admin = {
	settings: {
		/** Get all app settings (merged with defaults) */
		async list(): Promise<AppSettingsMap> {
			const res = await apiFetch<{ settings: AppSettingsMap }>('GET', '/api/admin/settings');
			return res.settings;
		},

		/** Batch update settings */
		async update(settings: Record<string, string>): Promise<AppSettingsMap> {
			const res = await apiFetch<{ settings: AppSettingsMap }>('PATCH', '/api/admin/settings', {
				body: { settings }
			});
			return res.settings;
		}
	},

	analysts: {
		/** List all analysts (including soft-deleted) */
		async list(): Promise<AdminAnalyst[]> {
			return apiFetch<AdminAnalyst[]>('GET', '/api/admin/analysts');
		},

		/** Update an analyst (role, active status, etc.) */
		async update(uuid: string, data: Partial<Pick<AdminAnalyst, 'role' | 'active' | 'username' | 'full_name'>>): Promise<AdminAnalyst> {
			return apiFetch<AdminAnalyst>('PATCH', `/api/admin/analysts/${uuid}`, {
				body: data
			});
		}
	}
} as const;
