import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {

	// Fetch data from API endpoints instead of direct DB access
	const healthRes = await Promise.resolve(fetch('/api/health'));

	const health = await healthRes.json();

	return {
		health,
	};
};