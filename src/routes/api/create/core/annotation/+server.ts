import type { RequestHandler } from './$types';
import type { NewAnnotation } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	const annotationData: NewAnnotation = {
		incident_id: body.incident_id,
		noted_by: body.noted_by,
		annotation_type: body.annotation_type,
		content: body.content,
		confidence: body.confidence,
		refers_to: body.refers_to,
		is_hypothesis: body.is_hypothesis,
		tags: body.tags
	};

	if (!annotationData) {
		throw error(400, 'Missing required annotation data');
	}

	try {
		await db
		.insert(schema.annotations)
		.values(annotationData)
		.returning();
	} catch (err) {
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
 
	return json(true);
};