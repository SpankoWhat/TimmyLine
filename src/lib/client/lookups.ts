/**
 * Client SDK — Lookups resource
 * Usage: import { lookups } from '$lib/client'
 */
import { apiFetch } from './base';
import type {
	LookupTableName,
	ListLookupsParams,
	CreateLookupData,
	UpdateLookupData,
	LookupRow
} from '$lib/types';

const BASE = '/api/lookups';

export const lookups = {
	/** List all entries in a lookup table */
	list(table: LookupTableName, opts?: Omit<ListLookupsParams, 'table'>): Promise<LookupRow[]> {
		return apiFetch<LookupRow[]>('GET', `${BASE}/${table}`, { query: opts });
	},

	/** Create a new lookup entry */
	create(table: LookupTableName, data: Omit<CreateLookupData, 'table'>): Promise<LookupRow> {
		return apiFetch<LookupRow>('POST', `${BASE}/${table}`, { body: data });
	},

	/** Update a lookup entry */
	update(table: LookupTableName, data: Omit<UpdateLookupData, 'table'>): Promise<LookupRow> {
		return apiFetch<LookupRow>('PATCH', `${BASE}/${table}`, { body: data });
	},

	/** Soft-delete a lookup entry */
	softDelete(table: LookupTableName, name: string): Promise<LookupRow> {
		return apiFetch<LookupRow>('PATCH', `${BASE}/${table}`, { body: { name, action: 'soft-delete' } });
	},

	/** Restore a soft-deleted lookup entry */
	restore(table: LookupTableName, name: string): Promise<LookupRow> {
		return apiFetch<LookupRow>('PATCH', `${BASE}/${table}`, { body: { name, action: 'restore' } });
	},

	/** Hard-delete a lookup entry (requires admin) */
	hardDelete(table: LookupTableName, name: string): Promise<void> {
		return apiFetch<void>('DELETE', `${BASE}/${table}`, { body: { name } });
	}
};
