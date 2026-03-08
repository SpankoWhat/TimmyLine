/**
 * Client SDK — Investigation Actions resource
 * Usage: import { actions } from '$lib/client'
 */
import { apiFetch } from './base';
import type {
	ListInvestigationActionsParams,
	CreateInvestigationActionData,
	UpdateInvestigationActionData,
	InvestigationAction
} from '$lib/types';

const BASE = '/api/actions';

export const actions = {
	/** List investigation actions, optionally filtered */
	list(params?: Omit<ListInvestigationActionsParams, 'uuid'>): Promise<InvestigationAction[]> {
		return apiFetch<InvestigationAction[]>('GET', BASE, { query: params as Record<string, string | number | boolean | undefined> });
	},

	/** Create a new investigation action */
	create(data: CreateInvestigationActionData): Promise<InvestigationAction> {
		return apiFetch<InvestigationAction>('POST', BASE, { body: data });
	},

	/** Update an investigation action (partial) */
	update(uuid: string, data: Omit<UpdateInvestigationActionData, 'uuid'>): Promise<InvestigationAction> {
		return apiFetch<InvestigationAction>('PATCH', `${BASE}/${uuid}`, { body: data });
	},

	/** Soft-delete an investigation action */
	delete(uuid: string, opts?: { incident_id?: string }): Promise<void> {
		return apiFetch<void>('DELETE', `${BASE}/${uuid}`, { body: opts });
	}
};
