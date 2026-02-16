import { json, type RequestEvent } from '@sveltejs/kit';
import { db } from '$lib/server';
import { requireReadAccess } from '$lib/server/auth/authorization';

/**
 * Enriched timeline endpoint
 * Fetches events and actions with their relationships pre-joined
 * Returns events with linked entities, and actions with linked events and entities
 */
export async function GET(event: RequestEvent) {
	await requireReadAccess(event);
	const { url } = event;

	const incident_id = url.searchParams.get('incident_id');
	const include_deleted = url.searchParams.get('include_deleted');

	if (!incident_id) {
		return json({ error: 'incident_id parameter is required' }, { status: 400 });
	}

	try {
		// Use Drizzle's query API with automatic joins
		const [events, actions] = await Promise.all([
			// Fetch events with their related entities
			db.query.timeline_events.findMany({
				where: (events, { eq, and, isNull }) =>
					include_deleted === 'true'
						? eq(events.incident_id, incident_id)
						: and(eq(events.incident_id, incident_id), isNull(events.deleted_at)),
				with: {
					eventEntities: {
						with: {
							entity: true // Includes full entity object
						}
					}
				}
			}),

			// Fetch actions with their related events and entities
			db.query.investigation_actions.findMany({
				where: (actions, { eq, and, isNull }) =>
					include_deleted === 'true'
						? eq(actions.incident_id, incident_id)
						: and(eq(actions.incident_id, incident_id), isNull(actions.deleted_at)),
				with: {
					actionEvents: {
						with: {
							event: true // Includes linked event
						}
					},
					actionEntities: {
						with: {
							entity: true // Includes full entity object
						}
					}
				}
			})
		]);

		return json({ events, actions });
	} catch (error) {
		console.error('Error fetching enriched timeline:', error);
		return json(
			{ error: 'Failed to fetch enriched timeline data', details: error },
			{ status: 500 }
		);
	}
}
