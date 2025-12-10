/**
 * Modal Registry - Central hub for all modal handlers
 * This is the main entry point for the modal system
 */

import { writable } from 'svelte/store';
import type { EntityType, ModalMode, EntityModalHandler, ModalConfig } from './types';
import { incidentHandler } from './entities/incident';
import { timelineEventHandler } from './entities/timelineEvent';
import { investigationActionHandler } from './entities/investigationAction';
import { entityHandler } from './entities/entity';
import { annotationHandler } from './entities/annotation';
import { analystHandler } from './entities/analyst';
import { 
	actionTypeHandler, 
	entityTypeHandler, 
	eventTypeHandler, 
	annotationTypeHandler 
} from './lookups';

/**
 * Modal state store
 */
const createModalStore = () => {
	const { subscribe, set, update } = writable<ModalConfig | null>(null);

	return {
		subscribe,
		open: (config: Omit<ModalConfig, 'isOpen'>) => {
			set({ ...config, isOpen: true });
		},
		close: () => {
			set(null);
		}
	};
};

export const modalStore = createModalStore();

/**
 * Central registry of all entity modal handlers
 */
const handlers: Record<EntityType, EntityModalHandler> = {
	incident: incidentHandler,
	timeline_event: timelineEventHandler,
	investigation_action: investigationActionHandler,
	entity: entityHandler,
	annotation: annotationHandler,
	analyst: analystHandler,
	action_type: actionTypeHandler,
	entity_type: entityTypeHandler,
	event_type: eventTypeHandler,
	annotation_type: annotationTypeHandler
};

/**
 * Get the handler for a specific entity type
 */
export function getHandler(entityType: EntityType): EntityModalHandler {
	const handler = handlers[entityType];
	if (!handler) {
		throw new Error(`No modal handler registered for entity type: ${entityType}`);
	}
	return handler;
}

/**
 * Validate form data using the handler's validation logic
 * Combines field-level validation with custom handler validation
 * 
 * @param entityType - The type of entity
 * @param formData - The form data to validate
 * @param fields - The field configurations
 * @returns Object with field errors, or null if valid
 */
export function validateFormData(
	entityType: EntityType,
	formData: any,
	fields: any[]
): Record<string, string> | null {
	const handler = getHandler(entityType);
	const errors: Record<string, string> = {};
	
	// Generic Field-level validation
	fields.forEach(field => {
		if (field.required && (!formData[field.key] || formData[field.key] === '')) {
			errors[field.key] = `${field.label} is required`;
		}
		
		if (field.validation && formData[field.key]) {
			const error = field.validation(formData[field.key]);
			if (error) {
				errors[field.key] = error;
			}
		}
	});
	
	// Custom handler validation if exists
	if (handler.validate) {
		const customErrors = handler.validate(formData);
		if (customErrors) {
			Object.assign(errors, customErrors);
		}
	}
	
	return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Submit form data using the handler's submit logic
 * Handles data preparation and API submission
 * 
 * @param entityType - The type of entity
 * @param mode - The modal mode
 * @param formData - The form data to submit
 * @returns The result from the API
 */
export async function submitFormData(
	entityType: EntityType,
	mode: ModalMode,
	formData: any
) {
	const handler = getHandler(entityType);
	
	// Prepare data (add context, convert types, etc.)
	const preparedData = handler.prepareData(formData, mode);
	
	// Submit to API
	const result = await handler.submit(preparedData, mode);
	
	return result;
}

/**
 * Create a complete modal configuration for opening a modal
 * This is the main factory function that components should use
 * 
 * @param entityType - The type of entity to create/edit
 * @param mode - The modal mode (create, edit, view, delete)
 * @param existingData - Optional existing data for edit/view modes
 * @returns Modal configuration ready to pass to modalStore.open()
 */
export function createModalConfig(
	entityType: EntityType,
	mode: ModalMode = 'create',
	existingData?: any
): Omit<ModalConfig, 'isOpen'> {
	return {
		title: entityType.replace(/_/g, ' '),
		entityType,
		mode,
		data: existingData
	};
}

/**
 * Quick shorthand for creating a "create" modal
 */
export function createModal(entityType: EntityType) {
	return createModalConfig(entityType, 'create');
}

/**
 * Quick shorthand for creating an "edit" modal
 */
export function editModal(entityType: EntityType, existingData: any) {
	return createModalConfig(entityType, 'edit', existingData);
}

/**
 * Quick shorthand for creating a "view" modal
 */
export function viewModal(entityType: EntityType, existingData: any) {
	return createModalConfig(entityType, 'view', existingData);
}
