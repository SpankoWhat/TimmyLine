import type { LayoutServerLoad } from './$types';

/**
 * Incident layout server load function
 * Passes session data to all incident pages
 */
export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();

	return {
		session
	};
};
