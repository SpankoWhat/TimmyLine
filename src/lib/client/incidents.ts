/**
 * Client SDK — Incidents resource
 * Usage: import { incidents } from '$lib/client'
 */
import { apiFetch } from './base';
import type {
	ListIncidentsParams,
	CreateIncidentData,
	UpdateIncidentData,
	Incident
} from '$lib/types';

const BASE = '/api/incidents';

export const incidents = {
	/** List all incidents, optionally filtered */
	list(params?: Omit<ListIncidentsParams, 'uuid'>): Promise<Incident[]> {
		return apiFetch<Incident[]>('GET', BASE, { query: params as Record<string, string | number | boolean | undefined> });
	},

	/** Get a single incident by UUID */
	get(uuid: string): Promise<Incident> {
		return apiFetch<Incident>('GET', `${BASE}/${uuid}`);
	},

	/** Create a new incident */
	create(data: CreateIncidentData): Promise<Incident> {
		return apiFetch<Incident>('POST', BASE, { body: data });
	},

	/** Update an incident (partial) */
	update(uuid: string, data: Omit<UpdateIncidentData, 'uuid'>): Promise<Incident> {
		return apiFetch<Incident>('PATCH', `${BASE}/${uuid}`, { body: data });
	},

	/** Soft-delete an incident (requires admin) */
	delete(uuid: string): Promise<void> {
		return apiFetch<void>('DELETE', `${BASE}/${uuid}`);
	}
};
