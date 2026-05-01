/**
 * Enriched Timeline Service
 *
 * Provides the enriched timeline view (events with linked entities,
 * actions with linked events and entities) using Drizzle's relational query API.
 */

import { db } from '$lib/server';
import { ServiceError, requireReadServiceAccess, type ServiceContext } from './types';
import type { GetEnrichedTimelineParams } from '$lib/types/enriched';

// ============================================================================
// Enriched Timeline
// ============================================================================

export async function getEnrichedTimeline(params: GetEnrichedTimelineParams, ctx: ServiceContext) {
	requireReadServiceAccess(ctx);

	if (!params.incident_id) {
		throw new ServiceError(400, 'MISSING_FIELDS', 'incident_id parameter is required');
	}

	try {
		const [events, actions] = await Promise.all([
			db.query.timeline_events.findMany({
				where: (events, { eq, and, isNull }) =>
					params.include_deleted
						? eq(events.incident_id, params.incident_id)
						: and(eq(events.incident_id, params.incident_id), isNull(events.deleted_at)),
				with: {
					eventEntities: {
						with: {
							entity: true
						}
					}
				}
			}),

			db.query.investigation_actions.findMany({
				where: (actions, { eq, and, isNull }) =>
					params.include_deleted
						? eq(actions.incident_id, params.incident_id)
						: and(eq(actions.incident_id, params.incident_id), isNull(actions.deleted_at)),
				with: {
					actionEvents: {
						with: {
							event: true
						}
					},
					actionEntities: {
						with: {
							entity: true
						}
					}
				}
			})
		]);

		return { events, actions };
	} catch (error) {
		throw new ServiceError(
			500,
			'QUERY_FAILED',
			`Failed to fetch enriched timeline data: ${(error as Error).message}`
		);
	}
}
