import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load function
 * Passes session data to ALL pages (runs before any route)
 */
export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();

	return {
		session
	};
};
