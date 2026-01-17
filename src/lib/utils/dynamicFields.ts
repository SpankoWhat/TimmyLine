/**
 * Dynamic Field Parser Utility
 * 
 * Parses JSON fields marked with allowDynamicFieldRendering and generates
 * virtual DisplayField objects for each property found in the JSON.
 */

import type { DisplayField, DisplayFieldsConfiguration } from '$lib/config/displayFieldsConfig';

/**
 * Result of parsing JSON fields from timeline items
 */
export interface ParsedDynamicFields {
	event: Map<string, DisplayField[]>; // parentKey -> discovered sub-fields
	action: Map<string, DisplayField[]>;
}

/**
 * Converts a JSON property key to a human-readable label
 * e.g., 'source_ip' -> 'Source Ip', 'portNumber' -> 'Port Number'
 */
function keyToLabel(key: string): string {
	return key
		// Handle snake_case
		.replace(/_/g, ' ')
		// Handle camelCase
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		// Capitalize first letter of each word
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Formats a value for display
 * Arrays become comma-separated, objects become JSON strings, primitives stay as-is
 */
export function formatDynamicValue(value: unknown): string {
	if (value === null || value === undefined) {
		return '—';
	}
	if (Array.isArray(value)) {
		return value.map(v => formatDynamicValue(v)).join(', ');
	}
	if (typeof value === 'object') {
		return JSON.stringify(value);
	}
	return String(value);
}

/**
 * Safely parses a JSON string, returning null if parsing fails
 */
function safeJsonParse(jsonString: string | null | undefined): Record<string, unknown> | null {
	if (!jsonString || typeof jsonString !== 'string') {
		return null;
	}
	try {
		const parsed = JSON.parse(jsonString);
		// Only return if it's an object (not array or primitive)
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		return null;
	} catch {
		return null;
	}
}

/**
 * Gets a value from an object using dot notation
 * e.g., getNestedValue(obj, 'event_data.source_ip') returns obj.event_data.source_ip
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split('.');
	let current: unknown = obj;
	
	for (const part of parts) {
		if (current === null || current === undefined) {
			return undefined;
		}
		if (typeof current === 'object') {
			current = (current as Record<string, unknown>)[part];
		} else {
			return undefined;
		}
	}
	
	return current;
}

/**
 * Minimal field info needed for getFieldValue
 */
export interface FieldValueInfo {
	key: string;
	isDynamic?: boolean;
	parentKey?: string;
	allowDynamicFieldRendering?: boolean;
}

/**
 * Gets the display value for a field, handling both regular fields and dynamic JSON sub-fields
 */
export function getFieldValue(
	data: Record<string, unknown>,
	field: FieldValueInfo
): string {
	if (field.isDynamic && field.parentKey) {
		// This is a dynamic sub-field - need to parse parent JSON first
		const parentValue = data[field.parentKey];
		const parsed = safeJsonParse(parentValue as string);
		
		if (parsed) {
			// Extract the sub-key (remove parent prefix)
			// e.g., 'event_data.source_ip' -> 'source_ip'
			const subKey = field.key.replace(`${field.parentKey}.`, '');
			const value = getNestedValue(parsed, subKey);
			return formatDynamicValue(value);
		}
		return '—';
	}
	
	// Regular field - direct access
	const value = data[field.key];
	
	// If this field has allowDynamicFieldRendering but we're showing the raw field,
	// just return the raw value (or a placeholder if it's complex JSON)
	if (field.allowDynamicFieldRendering) {
		const parsed = safeJsonParse(value as string);
		if (parsed) {
			// Return a summary instead of raw JSON
			const keys = Object.keys(parsed);
			return `{${keys.length} fields}`;
		}
	}
	
	return formatDynamicValue(value);
}

/**
 * Discovers all unique JSON sub-fields from a collection of timeline items
 * 
 * @param items - Array of timeline items (events or actions)
 * @param fieldConfig - The field configuration to check for allowDynamicFieldRendering
 * @param itemType - 'event' or 'action'
 * @returns Map of parentKey -> array of discovered DisplayField sub-fields
 */
export function discoverDynamicFields(
	items: Array<{ type: string; data: Record<string, unknown> }>,
	fieldConfig: DisplayFieldsConfiguration,
	itemType: 'event' | 'action'
): Map<string, DisplayField[]> {
	const discoveredFields = new Map<string, DisplayField[]>();
	const seenKeys = new Map<string, Set<string>>(); // parentKey -> set of discovered subKeys
	
	// Find fields that allow dynamic rendering
	const dynamicParentFields = fieldConfig[itemType].filter(f => f.allowDynamicFieldRendering);
	
	if (dynamicParentFields.length === 0) {
		return discoveredFields;
	}
	
	// Initialize tracking sets
	for (const parentField of dynamicParentFields) {
		seenKeys.set(parentField.key, new Set());
		discoveredFields.set(parentField.key, []);
	}
	
	// Scan all items of this type for JSON properties
	for (const item of items) {
		if (item.type !== itemType) continue;
		
		for (const parentField of dynamicParentFields) {
			const rawValue = item.data[parentField.key];
			const parsed = safeJsonParse(rawValue as string);
			
			if (parsed) {
				const seenForParent = seenKeys.get(parentField.key)!;
				
				// Discover all keys in this JSON object
				for (const subKey of Object.keys(parsed)) {
					if (!seenForParent.has(subKey)) {
						seenForParent.add(subKey);
						
						// Create a virtual DisplayField for this sub-key
						const dynamicField: DisplayField = {
							key: `${parentField.key}.${subKey}`,
							label: keyToLabel(subKey),
							pinned: false,
							showInNote: false,
							order: parentField.order + seenForParent.size, // Order after parent
							hideFromUser: false,
							isDynamic: true,
							parentKey: parentField.key
						};
						
						discoveredFields.get(parentField.key)!.push(dynamicField);
					}
				}
			}
		}
	}
	
	return discoveredFields;
}

/**
 * Merges static field configuration with discovered dynamic fields
 * 
 * @param staticConfig - The base field configuration
 * @param dynamicFieldsMap - Map of discovered dynamic fields per parent
 * @param itemType - 'event' or 'action'
 * @returns Combined array of DisplayFields including dynamic sub-fields
 */
export function mergeFieldConfigs(
	staticConfig: DisplayField[],
	dynamicFieldsMap: Map<string, DisplayField[]>,
	existingDynamicStates?: DisplayField[]
): DisplayField[] {
	const result: DisplayField[] = [];
	
	for (const field of staticConfig) {
		// Add the static field
		result.push({ ...field });
		
		// If this field has dynamic sub-fields, add them after
		if (field.allowDynamicFieldRendering && dynamicFieldsMap.has(field.key)) {
			const dynamicSubFields = dynamicFieldsMap.get(field.key)!;
			
			for (const dynamicField of dynamicSubFields) {
				// Check if we have existing state for this dynamic field
				const existingState = existingDynamicStates?.find(f => f.key === dynamicField.key);
				
				if (existingState) {
					// Preserve user's pinned/order preferences
					result.push({ ...dynamicField, pinned: existingState.pinned, order: existingState.order });
				} else {
					result.push({ ...dynamicField });
				}
			}
		}
	}
	
	return result;
}

//Unused exports
/**
 * Gets all dynamic fields for a specific parent field from a fieldStates array
 */
export function getDynamicFieldsForParent(
	fieldStates: DisplayField[],
	parentKey: string
): DisplayField[] {
	return fieldStates.filter(f => f.isDynamic && f.parentKey === parentKey);
}

/**
 * Checks if a field key represents a dynamic sub-field
 */
export function isDynamicFieldKey(key: string): boolean {
	return key.includes('.');
}
