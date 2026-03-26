import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();

	if (!session?.user) {
		throw redirect(303, '/login');
	}

	// Admin-only guard: require 'admin' role
	if (session.user.analystRole !== 'admin') {
		throw redirect(303, '/home');
	}

	return { session };
};
