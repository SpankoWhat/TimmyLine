import type { RequestHandler } from './$types';
import type { NewAnnotation } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';

export const POST: RequestHandler = async ({ request }) => {
	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	// Validate required fields
	const requiredFields = { incident_id: body.incident_id, noted_by: body.noted_by, annotation_type: body.annotation_type, content: body.content };
	const missingFields = Object.entries(requiredFields)
		.filter(([_, value]) => value === undefined || value === null || value === '')
		.map(([key]) => key);

	if (missingFields.length > 0) {
		throw error(400, `Missing required fields: ${missingFields.join(', ')}`);
	}

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

	try {
		const [createdAnnotation] = await db
		.insert(schema.annotations)
		.values(annotationData)
		.returning();

		// Broadcast to all users in the incident room
		const io = getSocketIO();
		io.to(`incident:${body.incident_id}`).emit('entity-created', 'annotation', createdAnnotation);

		return json(createdAnnotation);
	} catch (err) {
        throw error(500, `Database insertion error: ${(err as Error).message}`);
	}
};