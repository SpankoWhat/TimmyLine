/**
 * Client SDK — Export resource
 * Usage: import { exportClient } from '$lib/client'
 */
import { apiFetch } from './base';
import type { TimeDisplayPreferences } from '$lib/utils/dateTime';

export type ExportDownloadOptions = Partial<TimeDisplayPreferences>;

export const exportClient = {
	/**
	 * Download a self-contained HTML incident report.
	 * Returns the raw Response so the caller can trigger a download.
	 */
	async download(incident_id: string, options?: ExportDownloadOptions): Promise<Response> {
		return apiFetch<Response>('GET', '/api/export', {
			query: {
				incident_id,
				timezone: options?.timezone,
				absoluteFormat: options?.absoluteFormat,
				displayMode: options?.displayMode,
				showTooltipAlternate: options?.showTooltipAlternate
			},
			raw: true
		});
	}
};
