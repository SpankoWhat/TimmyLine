/**
 * Shared helpers for modal handlers
 * Eliminates duplicated fetch/submit and context-enrichment logic
 */

import { get, type Readable } from 'svelte/store';
import type { EntityModalHandler, EntityType, ModalSubmitResult } from './types';
import type { FieldConfig } from '$lib/config/modalFields';
import { entityFieldConfigs } from '$lib/config/modalFields';
import {
	currentSelectedIncident,
	currentSelectedAnalyst,
	currentCachedActions,
	currentCachedEvents,
	currentCachedEntities,
	relationTypes
} from '$lib/stores/cacheStore';

/**
 * Shared fetch + parse logic used by every entity/junction handler.
 * POSTs form data to the given endpoint and returns the parsed JSON response.
 */
export async function submitToApi(
	endpoint: string,
	data: Record<string, unknown>,
	mode: 'create' | 'edit'
): Promise<any> {
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.error || `Failed to ${mode}`);
	}

	return response.json();
}

/**
 * Adds `incident_id` and analyst UUID to form data.
 * The `analystKey` parameter lets each entity use its own column name
 * (e.g. discovered_by, noted_by, entered_by, actioned_by).
 */
export function addIncidentContext(
	formData: Record<string, unknown>,
	analystKey: string
): Record<string, unknown> {
	const incident = get(currentSelectedIncident);
	const analyst = get(currentSelectedAnalyst);

	return {
		...formData,
		incident_id: incident?.uuid,
		[analystKey]: analyst?.uuid
	};
}

// ---------------------------------------------------------------------------
// Junction handler factory
// ---------------------------------------------------------------------------

/**
 * Configuration for a single "foreign-key" dropdown in a junction handler.
 * `key`      – the field key in the form (e.g. "action_uuid")
 * `store`    – which cache store supplies the options
 * `labelFn`  – builds the human-readable label from one store item
 */
interface JunctionFieldMapping {
	key: string;
	store: 'actions' | 'events' | 'entities';
	labelFn: (item: any) => string;
}

/** Map symbolic store names to their actual writable stores */
const storeMap: Record<string, Readable<any[]>> = {
	actions: currentCachedActions,
	events: currentCachedEvents,
	entities: currentCachedEntities
};

/**
 * Creates an EntityModalHandler for junction (many-to-many) tables.
 *
 * Every junction handler follows the same pattern:
 *  - enrich relation_type + two FK selects from stores
 *  - attach incident_id before submit
 *  - POST to /api/{create|update}/junction/{name}
 *
 * @param junctionName  – the junction table key (e.g. "action_events")
 * @param fieldMappings – describes the two FK dropdowns for this junction
 */
export function createJunctionHandler(
	junctionName: EntityType,
	fieldMappings: JunctionFieldMapping[]
): EntityModalHandler {
	return {
		fields: entityFieldConfigs[junctionName],

		getEnrichedFields: () => {
			return entityFieldConfigs[junctionName].map((field: FieldConfig) => {
				// Relation type dropdown – always populated from relationTypes store
				if (field.key === 'relation_type') {
					return {
						...field,
						options: get(relationTypes).map(rt => ({
							value: rt.name,
							label: rt.name.replace(/_/g, ' ')
						}))
					};
				}

				// Check if this field matches one of the FK mappings
				const mapping = fieldMappings.find(m => m.key === field.key);
				if (mapping) {
					return {
						...field,
						options: get(storeMap[mapping.store]).map((item: any) => ({
							value: item.uuid,
							label: mapping.labelFn(item)
						}))
					};
				}

				return field;
			});
		},

		prepareData: (formData, _mode) => formData,

		submit: async (data, mode) => {
			const endpoint =
				mode === 'create'
					? `/api/create/junction/${junctionName}`
					: `/api/update/junction/${junctionName}`;

			data.incident_id = get(currentSelectedIncident)?.uuid;

			const result = await submitToApi(endpoint, data, mode as 'create' | 'edit');
			return { entity: result };
		}
	};
}
