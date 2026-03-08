import { type RequestHandler } from '@sveltejs/kit';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { exportIncidentHtml, ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
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
		const { html, filename } = await exportIncidentHtml(incidentId);

		return new Response(html, {
			status: 200,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-store'
			}
		});
	} catch (err) {
		if (err instanceof ServiceError) {
			return new Response(JSON.stringify({ error: err.message }), {
				status: err.status,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const message = err instanceof Error ? err.message : 'Unknown error';
		console.error('Export failed:', err);

		return new Response(JSON.stringify({ error: 'Export failed', details: message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
