/**
 * Type interfaces for enriched timeline queries.
 */

export interface GetEnrichedTimelineParams {
	incident_id: string;
	include_deleted?: boolean;
}

/** Enriched timeline response row */
export interface EnrichedTimelineRow {
	events: unknown[];
	actions: unknown[];
	entities: unknown[];
	annotations: unknown[];
}
