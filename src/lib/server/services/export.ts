/**
 * Export Service
 *
 * Service layer for incident data export. Wraps the export module
 * to provide the same service pattern used by all other services.
 */

import { aggregateIncidentData, type ExportPayload, type ExportTimelineItem } from '$lib/server/export/exportIncident';
import { renderExportHtml } from '$lib/server/export/exportTemplate';
import { ServiceError } from './types';

// Re-export types for convenience
export type { ExportPayload, ExportTimelineItem };

// ============================================================================
// Export Incident Data
// ============================================================================

/**
 * Aggregate all data for a single incident into an export payload.
 */
export async function exportIncidentData(incidentId: string): Promise<ExportPayload> {
	if (!incidentId) {
		throw new ServiceError(400, 'MISSING_FIELDS', 'incident_id is required');
	}

	try {
		return await aggregateIncidentData(incidentId);
	} catch (err) {
		const message = (err as Error).message ?? 'Unknown error';
		if (message.includes('not found')) {
			throw new ServiceError(404, 'NOT_FOUND', message);
		}
		throw new ServiceError(500, 'EXPORT_ERROR', `Failed to aggregate incident data: ${message}`);
	}
}

// ============================================================================
// Render Export HTML
// ============================================================================

/**
 * Render an export payload into a self-contained interactive HTML document.
 */
export function renderExportToHtml(payload: ExportPayload): string {
	try {
		return renderExportHtml(payload);
	} catch (err) {
		throw new ServiceError(500, 'RENDER_ERROR', `Failed to render export HTML: ${(err as Error).message}`);
	}
}

// ============================================================================
// Full Export Pipeline
// ============================================================================

/**
 * Complete export pipeline: aggregate data + render to HTML.
 * Returns the HTML string and a suggested filename.
 */
export async function exportIncidentHtml(incidentId: string): Promise<{ html: string; filename: string }> {
	const payload = await exportIncidentData(incidentId);
	const html = renderExportToHtml(payload);

	const safeTitle = payload.incident.title
		.replace(/[^a-zA-Z0-9_\- ]/g, '')
		.replace(/\s+/g, '_')
		.substring(0, 60);
	const filename = `TimmyLine_${safeTitle}_${incidentId.substring(0, 8)}.html`;

	return { html, filename };
}
