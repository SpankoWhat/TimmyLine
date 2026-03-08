/**
 * Client SDK — Enriched Timeline resource
 * Usage: import { timeline } from '$lib/client'
 */
import { apiFetch } from './base';
import type { GetEnrichedTimelineParams } from '$lib/types';

export const timeline = {
	/**
	 * Get the enriched timeline for an incident.
	 * Returns events with their linked actions and entities.
	 */
	getEnriched(params: GetEnrichedTimelineParams): Promise<unknown> {
		return apiFetch<unknown>('GET', '/api/timeline', {
			query: params as unknown as Record<string, string | boolean | undefined>
		});
	}
};
