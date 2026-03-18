/**
 * Client SDK — Timeline Events resource
 * Usage: import { events } from '$lib/client'
 */
import { apiFetch } from './base';
import type {
	ListTimelineEventsParams,
	CreateTimelineEventData,
	UpdateTimelineEventData,
	TimelineEvent
} from '$lib/types';

const BASE = '/api/events';

export const events = {
	/** List timeline events, optionally filtered */
	list(params?: Omit<ListTimelineEventsParams, 'uuid'>): Promise<TimelineEvent[]> {
		return apiFetch<TimelineEvent[]>('GET', BASE, { query: params as Record<string, string | number | boolean | undefined> });
	},

	/** Create a new timeline event */
	create(data: CreateTimelineEventData): Promise<TimelineEvent> {
		return apiFetch<TimelineEvent>('POST', BASE, { body: data });
	},

	/** Update a timeline event (partial) */
	update(uuid: string, data: Omit<UpdateTimelineEventData, 'uuid'>): Promise<TimelineEvent> {
		return apiFetch<TimelineEvent>('PATCH', `${BASE}/${uuid}`, { body: data });
	},

	// TODO: consider if needing and incidnet_id in delete body for extra safety, or require it in URL like /api/incidents/{incident_id}/events/{event_id}
	/** Soft-delete a timeline event */
	delete(uuid: string, opts?: { incident_id?: string }): Promise<void> {
		return apiFetch<void>('DELETE', `${BASE}/${uuid}`, { body: opts });
	}
};
