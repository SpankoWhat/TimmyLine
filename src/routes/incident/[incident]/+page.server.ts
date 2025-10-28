import type { PageServerLoad } from './$types';
import { db } from '$lib/server';
import { incidents } from '$lib/server/database/02_01_core_incidents';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	// Fetch the incident from the database
	const incident = await db
		.select()
		.from(incidents)
		.where(eq(incidents.uuid, params.incident))
		.limit(1);
	
	return {
		incidentuuid: params.incident,
		incident: incident[0] || null
	};
};