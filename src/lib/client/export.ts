/**
 * Client SDK — Export resource
 * Usage: import { exportClient } from '$lib/client'
 */
import { apiFetch } from './base';

export const exportClient = {
	/**
	 * Download a self-contained HTML incident report.
	 * Returns the raw Response so the caller can trigger a download.
	 */
	async download(incident_id: string): Promise<Response> {
		return apiFetch<Response>('GET', '/api/export', {
			query: { incident_id },
			raw: true
		});
	}
};
