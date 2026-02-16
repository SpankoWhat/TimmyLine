import type { RequestHandler } from './$types';
import type { NewAnnotation } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { getSocketIO } from '$lib/server/socket';
import { eq } from 'drizzle-orm';
import { requireWriteAccess } from '$lib/server/auth/authorization';

export const POST: RequestHandler = async (event) => {
	await requireWriteAccess(event);
	const { request } = event;

	let body;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	if (!body.uuid) {
		throw error(400, 'Missing required field: uuid');
	}

	if (body.confidence && !['high', 'medium', 'low', 'guess'].includes(body.confidence)) {
		throw error(400, `Invalid confidence value: ${body.confidence}`);
	}

	const annotationData: Partial<NewAnnotation> = {
		incident_id: body.incident_id,
		noted_by: body.noted_by,
		annotation_type: body.annotation_type,
		content: body.content,
		confidence: body.confidence,
		refers_to: body.refers_to,
		is_hypothesis: body.is_hypothesis,
		tags: body.tags,
		updated_at: Math.floor(Date.now() / 1000)
	};

	const cleanedData = Object.fromEntries(
		Object.entries(annotationData).filter(([_, v]) => v !== undefined)
	);

	try {
		const [updatedAnnotation] = await db
		.update(schema.annotations)
		.set(cleanedData)
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