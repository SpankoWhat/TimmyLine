import type { PageServerLoad } from './$types';
import { enabledProviders } from '$lib/server/auth/config';

export const load: PageServerLoad = async () => {
	return {
		enabledProviders
	};
};
