import { type RequestHandler } from '@sveltejs/kit';
import { requireReadAccess } from '$lib/server/auth/authorization';
import { exportIncidentHtml, ServiceError } from '$lib/server/services';
import {
	normalizeAbsoluteFormat,
	normalizeDisplayMode,
	normalizeTimezone,
	type TimeDisplayPreferences
} from '$lib/utils/dateTime';

function parseBooleanQuery(value: string | null): boolean | undefined {
	if (value === null) {
		return undefined;
	}

	const normalized = value.trim().toLowerCase();
	if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
		return true;
	}

	if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
		return false;
	}

	return undefined;
}

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

	const requestedTimePreferences: Partial<TimeDisplayPreferences> = {};

	const timezoneQuery = url.searchParams.get('timezone');
	if (timezoneQuery !== null) {
		requestedTimePreferences.timezone = normalizeTimezone(timezoneQuery);
	}

	const absoluteFormatQuery = url.searchParams.get('absoluteFormat');
	if (absoluteFormatQuery !== null) {
		requestedTimePreferences.absoluteFormat = normalizeAbsoluteFormat(absoluteFormatQuery);
	}

	const displayModeQuery = url.searchParams.get('displayMode');
	if (displayModeQuery !== null) {
		requestedTimePreferences.displayMode = normalizeDisplayMode(displayModeQuery);
	}

	const showTooltipAlternate =
		parseBooleanQuery(url.searchParams.get('showTooltipAlternate')) ??
		parseBooleanQuery(url.searchParams.get('show_tooltip_alternate'));
	if (showTooltipAlternate !== undefined) {
		requestedTimePreferences.showTooltipAlternate = showTooltipAlternate;
	}

	const hasPreferenceOverrides = Object.values(requestedTimePreferences).some((value) => value !== undefined);

	try {
		const { html, filename } = await exportIncidentHtml(
			incidentId,
			hasPreferenceOverrides ? { timePreferences: requestedTimePreferences } : undefined
		);

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
