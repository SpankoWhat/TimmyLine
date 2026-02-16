/**
 * Shared helpers and factories for modal handlers.
 *
 * Three factories cover every handler type:
 *   createEntityHandler   – core entities (incident, event, action …)
 *   createJunctionHandler – many-to-many junction tables
 *   createLookupHandler   – (lives in lookups/index.ts, uses submitToApi)
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

// ---------------------------------------------------------------------------
// Entity handler factory
// ---------------------------------------------------------------------------

/** Declares a datetime field that should be auto-converted to epoch seconds. */
interface EpochField {
	/** The field key (must match a key in the field config) */
	key: string;
	/**
	 * When the field value is empty/falsy:
	 *   true  → default to `Math.floor(Date.now() / 1000)`
	 *   false → default to `null`
	 */
	defaultToNow?: boolean;
}

/** Everything that varies between core-entity handlers. */
export interface EntityHandlerConfig {
	/** Key into `entityFieldConfigs` AND the EntityType union (e.g. 'timeline_event') */
	entityKey: EntityType;
	/** API path segment after /api/{create|update}/ (e.g. 'core/timeline_event') */
	apiPath: string;
	/**
	 * If set, `addIncidentContext` is called during `prepareData`
	 * using this value as the analyst-column name
	 * (e.g. 'discovered_by', 'noted_by', 'actioned_by', 'entered_by').
	 */
	analystKey?: string;
	/**
	 * Maps a field key to the store that supplies its dropdown options.
	 * Each store item is expected to have a `.name` property.
	 * e.g. `{ event_type: eventTypes }`
	 */
	storeEnrichments?: Record<string, Readable<any[]>>;
	/** Datetime fields that should be auto-converted to epoch seconds. */
	epochFields?: EpochField[];
	/** Optional custom validation (runs after generic required-field checks). */
	validate?: (formData: any) => Record<string, string> | null;
}

/**
 * Factory that builds an `EntityModalHandler` from a small config object.
 *
 * Centralises the four things every core-entity handler does:
 *   1. Enrich select fields with store data
 *   2. Attach incident + analyst context
 *   3. Convert datetime strings → epoch seconds
 *   4. POST to the correct API endpoint
 */
export function createEntityHandler(config: EntityHandlerConfig): EntityModalHandler {
	const { entityKey, apiPath, analystKey, storeEnrichments, epochFields, validate } = config;

	return {
		fields: entityFieldConfigs[entityKey],

		getEnrichedFields: () => {
			if (!storeEnrichments) return entityFieldConfigs[entityKey];

			return entityFieldConfigs[entityKey].map((field: FieldConfig) => {
				const store = storeEnrichments[field.key];
				if (store) {
					return {
						...field,
						options: get(store).map((item: any) => ({
							value: item.name,
							label: item.name
						}))
					};
				}
				return field;
			});
		},

		prepareData: (formData, _mode) => {
			let data = analystKey
				? addIncidentContext(formData, analystKey)
				: { ...formData };

			if (epochFields) {
				for (const ef of epochFields) {
					data[ef.key] = data[ef.key]
						? Math.floor(new Date(data[ef.key] as string).getTime() / 1000)
						: ef.defaultToNow
							? Math.floor(Date.now() / 1000)
							: null;
				}
			}

			return data;
		},

		submit: async (data, mode) => {
			const endpoint = mode === 'create'
				? `/api/create/${apiPath}`
				: `/api/update/${apiPath}`;

			const entity = await submitToApi(endpoint, data, mode as 'create' | 'edit');
			return { entity };
		},

		...(validate ? { validate } : {})
	};
}
