/**
 * Shared types for the modal system
 */

import type { FieldConfig } from '$lib/config/modalFields';

export type EntityType = 
	| 'incident' 
	| 'timeline_event' 
	| 'investigation_action' 
	| 'entity' 
	| 'annotation' 
	| 'action_type' 
	| 'entity_type' 
	| 'event_type' 
	| 'annotation_type' 
	| 'analyst'
	| 'action_entities'
	| 'action_events'
	| 'event_entities';

export type ModalMode = 'create' | 'edit' | 'view' | 'delete';

export interface ModalSubmitResult {
	entity?: any;
	lookupData?: any[];
}

export interface EntityModalHandler {
	/** Field configuration for the form */
	fields: FieldConfig[];
	
	/** Enrich fields with dynamic data (e.g., dropdown options from stores) */
	getEnrichedFields: () => FieldConfig[];
	
	/** Prepare data before submission (add context, convert types, etc.) */
	prepareData: (formData: any, mode: ModalMode) => any;
	
	/** Submit the data to the API */
	submit: (preparedData: any, mode: ModalMode) => Promise<ModalSubmitResult>;
	
	/** Optional: Custom validation beyond field-level validation */
	validate?: (formData: any) => Record<string, string> | null;
}

export interface ModalConfig {
	isOpen: boolean;
	title: string;
	entityType: EntityType;
	mode: ModalMode;
	data?: any;
	onCancel?: () => void;
}
