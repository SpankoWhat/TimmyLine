import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load function
 * Passes session data and health status to ALL pages (runs before any route)
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
