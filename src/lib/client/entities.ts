/**
 * Client SDK — Entities resource
 * Usage: import { entities } from '$lib/client'
 */
import { apiFetch } from './base';
import type {
	ListEntitiesParams,
	CreateEntityData,
	UpdateEntityData,
	Entity
} from '$lib/types';

const BASE = '/api/entities';

export const entities = {
	/** List entities, optionally filtered */
	list(params?: Omit<ListEntitiesParams, 'uuid'>): Promise<Entity[]> {
		return apiFetch<Entity[]>('GET', BASE, { query: params as Record<string, string | number | boolean | undefined> });
	},

	/** Create a new entity */
	create(data: CreateEntityData): Promise<Entity> {
		return apiFetch<Entity>('POST', BASE, { body: data });
	},

	/** Update an entity (partial) */
	update(uuid: string, data: Omit<UpdateEntityData, 'uuid'>): Promise<Entity> {
		return apiFetch<Entity>('PATCH', `${BASE}/${uuid}`, { body: data });
	},

	/** Soft-delete an entity */
	delete(uuid: string, opts?: { incident_id?: string }): Promise<void> {
		return apiFetch<void>('DELETE', `${BASE}/${uuid}`, { body: opts });
	}
};
