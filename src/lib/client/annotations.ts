/**
 * Client SDK — Annotations resource
 * Usage: import { annotations } from '$lib/client'
 */
import { apiFetch } from './base';
import type {
	ListAnnotationsParams,
	CreateAnnotationData,
	UpdateAnnotationData,
	Annotation
} from '$lib/types';

const BASE = '/api/annotations';

export const annotations = {
	/** List annotations, optionally filtered */
	list(params?: Omit<ListAnnotationsParams, 'uuid'>): Promise<Annotation[]> {
		return apiFetch<Annotation[]>('GET', BASE, { query: params as Record<string, string | number | boolean | undefined> });
	},

	/** Create a new annotation */
	create(data: CreateAnnotationData): Promise<Annotation> {
		return apiFetch<Annotation>('POST', BASE, { body: data });
	},

	/** Update an annotation (partial) */
	update(uuid: string, data: Omit<UpdateAnnotationData, 'uuid'>): Promise<Annotation> {
		return apiFetch<Annotation>('PATCH', `${BASE}/${uuid}`, { body: data });
	},

	/** Soft-delete an annotation */
	delete(uuid: string, opts?: { incident_id?: string }): Promise<void> {
		return apiFetch<void>('DELETE', `${BASE}/${uuid}`, { body: opts });
	}
};
