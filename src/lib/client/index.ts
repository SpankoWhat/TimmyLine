/**
 * TimmyLine Client SDK
 *
 * Typed, fetch-based API client for all TimmyLine resources.
 * All functions throw `ApiError` on non-2xx responses.
 *
 * Usage:
 *   import { api } from '$lib/client';
 *   const incident = await api.incidents.create({ title: '...', status: 'In Progress', priority: 'high' });
 *
 * Or import individual namespaces:
 *   import { incidents, events } from '$lib/client';
 */

export { ApiError, apiFetch, buildQuery } from './base';

export { incidents } from './incidents';
export { events } from './events';
export { actions } from './actions';
export { entities } from './entities';
export { annotations } from './annotations';
export { analysts } from './analysts';
export { lookups } from './lookups';
export { eventEntities, actionEvents, actionEntities } from './junctions';
export { timeline } from './timeline';
export { apiKeys } from './apiKeys';
export { exportClient } from './export';
export { health } from './health';
export { admin } from './admin';

export type { ApiKeyRow, CreateApiKeyResponse, RevokeApiKeyResponse } from './apiKeys';
export type { HealthResponse } from './health';
export type { AdminAnalyst, AppSettingsMap } from './admin';

/**
 * Namespaced API object for ergonomic usage.
 *
 * @example
 * import { api } from '$lib/client';
 * api.incidents.list({ status: 'In Progress' });
 * api.events.create({ ... });
 * api.lookups.list('event_type');
 * api.eventEntities.create({ event_uuid: '...', entity_uuid: '...' });
 */
import { incidents } from './incidents';
import { events } from './events';
import { actions } from './actions';
import { entities } from './entities';
import { annotations } from './annotations';
import { analysts } from './analysts';
import { lookups } from './lookups';
import { eventEntities, actionEvents, actionEntities } from './junctions';
import { timeline } from './timeline';
import { apiKeys } from './apiKeys';
import { exportClient } from './export';
import { health } from './health';
import { admin } from './admin';

export const api = {
	incidents,
	events,
	actions,
	entities,
	annotations,
	analysts,
	lookups,
	eventEntities,
	actionEvents,
	actionEntities,
	timeline,
	apiKeys,
	export: exportClient,
	health,
	admin
} as const;
