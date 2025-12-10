import type { RequestHandler } from './$types';
import type { NewAnnotation } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	const annotationData: Partial<NewAnnotation> = {
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
		const [updatedAnnotation] = await db
		.update(schema.annotations)
		.set(annotationData)
		.where(eq(schema.annotations.uuid, body.uuid))
		.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('entity-updated', 'annotation', updatedAnnotation);

		return json(updatedAnnotation);
	} catch (err) {
        throw error(500, `Database update error: ${(err as Error).message}`);
	}
};