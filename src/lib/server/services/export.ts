/**
 * Export Service
 *
 * Service layer for incident data export. Wraps the export module
 * to provide the same service pattern used by all other services.
 */

import { aggregateIncidentData, type ExportPayload, type ExportTimelineItem } from '$lib/server/export/exportIncident';
import { renderExportHtml } from '$lib/server/export/exportTemplate';
import { ServiceError, requireReadServiceAccess } from './types';
import type { TimeDisplayPreferences } from '$lib/utils/dateTime';
import type { ServiceContext } from './types';

// Re-export types for convenience
export type { ExportPayload, ExportTimelineItem };

export interface ExportFormattingOptions {
	timePreferences?: Partial<TimeDisplayPreferences> | null;
}

// ============================================================================
// Export Incident Data
// ============================================================================

/**
 * Aggregate all data for a single incident into an export payload.
 */
export async function exportIncidentData(incidentId: string, ctx: ServiceContext): Promise<ExportPayload> {
	requireReadServiceAccess(ctx);

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
export function renderExportToHtml(payload: ExportPayload, options: ExportFormattingOptions = {}): string {
	try {
		return renderExportHtml(payload, options);
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
export async function exportIncidentHtml(
	incidentId: string,
	ctx: ServiceContext,
	options: ExportFormattingOptions = {}
): Promise<{ html: string; filename: string }> {
	const payload = await exportIncidentData(incidentId, ctx);
	const html = renderExportToHtml(payload, options);

	const safeTitle = payload.incident.title
		.replace(/[^a-zA-Z0-9_\- ]/g, '')
		.replace(/\s+/g, '_')
		.substring(0, 60);
	const filename = `TimmyLine_${safeTitle}_${incidentId.substring(0, 8)}.html`;

	return { html, filename };
}
