/**
 * Shared types for the modal system.
 *
 * Individual modal components now own their own field definitions,
 * validation, and submit logic. These types only describe the
 * store contract used by ModalRouter + callsites.
 */

import type { DisplayField } from '$lib/config/displayFieldsConfig';

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

export interface ModalConfig {
	isOpen: boolean;
	title: string;
	entityType: EntityType;
	mode: ModalMode;
	data?: any;
}

export type DisplayFieldsConfig = {
	event: DisplayField[];
	action: DisplayField[];
};