import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdminAccess, buildServiceContext } from '$lib/server/auth/authorization';
import { getAllSettings, updateSettings } from '$lib/server/services/appSettings';
import { ServiceError } from '$lib/server/services';

export const GET: RequestHandler = async (event) => {
	await requireAdminAccess(event);

	try {
		const settings = await getAllSettings();
		return json({ settings });
	} catch (e: unknown) {
		if (e instanceof ServiceError) {
			return json({ error: e.message, code: e.code }, { status: e.status });
		}
		throw e;
	}
};

export const PATCH: RequestHandler = async (event) => {
	await requireAdminAccess(event);

	try {
		const { settings } = await event.request.json();

		if (!settings || typeof settings !== 'object') {
			return json({ error: 'Invalid request: settings must be a non-null object', code: 'INVALID_BODY' }, { status: 400 });
		}

		const ctx = buildServiceContext(event);
		const updated = await updateSettings(settings, ctx);
		return json({ settings: updated });
	} catch (e: unknown) {
		if (e instanceof ServiceError) {
			return json({ error: e.message, code: e.code }, { status: e.status });
		}
		throw e;
	}
};
