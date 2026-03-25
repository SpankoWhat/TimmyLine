import type { PageServerLoad } from './$types';
import { db } from '$lib/server';
import { incidents, analysts } from '$lib/server/database/';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	// Fetch the incident from the database
	const incident = await db
		.select()
		.from(incidents)
		.where(eq(incidents.uuid, params.incident))
		.limit(1);

	return {
		incident: incident[0] || null
	};
};