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
