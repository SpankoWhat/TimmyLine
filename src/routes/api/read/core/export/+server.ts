import { type RequestEvent } from '@sveltejs/kit';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { aggregateIncidentData } from '$lib/server/data/exportIncident';
import { renderExportHtml } from '$lib/server/data/exportTemplate';

/**
 * GET /api/read/core/export?incident_id=<uuid>
 *
 * Exports a full incident as a self-contained interactive HTML file.
 * The response is an HTML document with Content-Disposition attachment headers.
 *
 * Query params:
 *   - incident_id (required): UUID of the incident to export
 */
export async function GET(event: RequestEvent) {
	await requireReadAccess(event);
	const { url } = event;

	const incidentId = url.searchParams.get('incident_id');
	if (!incidentId) {
		return new Response(JSON.stringify({ error: 'incident_id parameter is required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// 1. Aggregate all incident data
		const payload = await aggregateIncidentData(incidentId);

		// 2. Render the self-contained HTML
		const html = renderExportHtml(payload);

		// 3. Build a safe filename
		const safeTitle = payload.incident.title
			.replace(/[^a-zA-Z0-9_\- ]/g, '')
			.replace(/\s+/g, '_')
			.substring(0, 60);
		const filename = `TimmyLine_${safeTitle}_${incidentId.substring(0, 8)}.html`;

		// 4. Return as downloadable HTML
		return new Response(html, {
			status: 200,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('Export failed:', err);

		if (message.includes('not found')) {
			return new Response(JSON.stringify({ error: message }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ error: 'Export failed', details: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
