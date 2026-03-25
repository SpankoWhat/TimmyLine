import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load function
 * Passes only session data to ALL pages (runs before any route).
 * Heavy initialisation (health check, caches, socket) is deferred
 * to the (app) route group layout so it never runs on public pages.
 */
export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();

	return {
		session
	};
};
