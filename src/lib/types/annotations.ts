/**
 * Type interfaces for annotation CRUD operations.
 */

export interface ListAnnotationsParams {
	uuid?: string;
	incident_id?: string;
	noted_by?: string;
	annotation_type?: string;
	created_at?: number;
	updated_at?: number;
	content?: string;
	confidence?: string;
	refers_to?: string;
	is_hypothesis?: boolean;
	tags?: string;
	include_deleted?: boolean;
}

export interface CreateAnnotationData {
	incident_id: string;
	noted_by: string;
	annotation_type: string;
	content: string;
	confidence?: string;
	refers_to?: string;
	is_hypothesis?: boolean;
	tags?: string;
}

export interface UpdateAnnotationData {
	uuid: string;
	incident_id?: string;
	noted_by?: string;
	annotation_type?: string;
	content?: string;
	confidence?: string;
	refers_to?: string;
	is_hypothesis?: boolean;
	tags?: string;
}

export interface DeleteAnnotationData {
	uuid: string;
	incident_id?: string;
}

/** Row shape returned by the API (mirrors annotations DB table) */
export interface Annotation {
	uuid: string;
	incident_id: string;
	noted_by: string;
	annotation_type: string;
	content: string;
	confidence: string | null;
	refers_to: string | null;
	is_hypothesis: number | null;
	tags: string | null;
	created_at: number | null;
	updated_at: number | null;
	deleted_at: number | null;
}
