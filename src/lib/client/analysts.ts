/**
 * Client SDK — Analysts resource
 * Usage: import { analysts } from '$lib/client'
 */
import { apiFetch } from './base';
import type {
	ListAnalystsParams,
	CreateAnalystData,
	UpdateAnalystData,
	Analyst
} from '$lib/types';

const BASE = '/api/analysts';

export const analysts = {
	/** List analysts, optionally filtered */
	list(params?: Omit<ListAnalystsParams, 'uuid'>): Promise<Analyst[]> {
		return apiFetch<Analyst[]>('GET', BASE, { query: params as Record<string, string | number | boolean | undefined> });
	},

	/** Get a single analyst by UUID */
	get(uuid: string): Promise<Analyst> {
		return apiFetch<Analyst[]>('GET', `${BASE}?uuid=${uuid}`).then((list: Analyst[]) => {
			if (!list.length) throw new Error(`Analyst ${uuid} not found`);
			return list[0];
		});
	},

	/** Create a new analyst */
	create(data: CreateAnalystData): Promise<Analyst> {
		return apiFetch<Analyst>('POST', BASE, { body: data });
	},

	/** Update an analyst (partial) */
	update(uuid: string, data: Omit<UpdateAnalystData, 'uuid'>): Promise<Analyst> {
		return apiFetch<Analyst>('PATCH', `${BASE}/${uuid}`, { body: data });
	},

	/** Soft-delete an analyst */
	delete(uuid: string): Promise<void> {
		return apiFetch<void>('DELETE', `${BASE}/${uuid}`);
	}
};
