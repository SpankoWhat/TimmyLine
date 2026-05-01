/**
 * Export Service
 *
 * Service layer for incident data export. Wraps the export module
 * to provide the same service pattern used by all other services.
 */

import { aggregateIncidentData, type ExportPayload, type ExportTimelineItem } from '$lib/server/export/exportIncident';
import { renderExportHtml } from '$lib/server/export/exportTemplate';
import { exportLogger } from '$lib/server/logging';
import { ServiceError, requireExportServiceAccess } from './types';
import type { TimeDisplayPreferences } from '$lib/utils/dateTime';
import type { ServiceContext } from './types';

// Re-export types for convenience
export type { ExportPayload, ExportTimelineItem };

export interface ExportFormattingOptions {
	timePreferences?: Partial<TimeDisplayPreferences> | null;
}

type ExportAuditType = 'data' | 'html';

function logExportAuditEvent(type: ExportAuditType, payload: ExportPayload, ctx: ServiceContext): void {
	exportLogger.info('Incident export completed', {
		exportType: type,
		classification: 'RED',
		incidentId: payload.incident.uuid,
		incidentTitle: payload.incident.title,
		actorUUID: ctx.actorUUID,
		actorUserId: ctx.actorUserId ?? null,
		actorRole: ctx.actorRole,
		timelineItems: payload.stats.totalItems,
		entities: payload.stats.entities,
		annotations: payload.stats.annotations
	});
}

function logExportFailure(type: ExportAuditType, incidentId: string, ctx: ServiceContext, err: unknown): void {
	exportLogger.warn('Incident export failed', {
		exportType: type,
		classification: 'RED',
		incidentId,
		actorUUID: ctx.actorUUID,
		actorUserId: ctx.actorUserId ?? null,
		actorRole: ctx.actorRole,
		error: err instanceof Error ? err.message : String(err)
	});
}

async function loadExportPayload(incidentId: string, ctx: ServiceContext): Promise<ExportPayload> {
	requireExportServiceAccess(ctx);

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
// Export Incident Data
// ============================================================================

/**
 * Aggregate all data for a single incident into an export payload.
 */
export async function exportIncidentData(incidentId: string, ctx: ServiceContext): Promise<ExportPayload> {
	try {
		const payload = await loadExportPayload(incidentId, ctx);
		logExportAuditEvent('data', payload, ctx);
		return payload;
	} catch (err) {
		logExportFailure('data', incidentId, ctx, err);
		throw err;
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
	try {
		const payload = await loadExportPayload(incidentId, ctx);
		const html = renderExportToHtml(payload, options);

		const safeTitle = payload.incident.title
			.replace(/[^a-zA-Z0-9_\- ]/g, '')
			.replace(/\s+/g, '_')
			.substring(0, 60);
		const filename = `TimmyLine_${safeTitle}_${incidentId.substring(0, 8)}.html`;

		logExportAuditEvent('html', payload, ctx);

		return { html, filename };
	} catch (err) {
		logExportFailure('html', incidentId, ctx, err);
		throw err;
	}
}
