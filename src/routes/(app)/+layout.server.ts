import type { LayoutServerLoad } from './$types';

/**
 * App layout server load function
 * Passes session data and health status to all authenticated app pages.
 * Runs only for routes within the (app) group (home, incident, settings).
 */
export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();

	// Fetch health status for sidebar
	const healthRes = await event.fetch('/api/health');
	const health = await healthRes.json();

	return {
		session,
		health
	};
};
