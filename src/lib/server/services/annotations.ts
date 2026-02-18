/**
 * Annotations Service
 *
 * Single source of truth for annotations CRUD operations,
 * validation, and Socket.IO broadcasting.
 */

import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq, and, isNull, type SQL } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ServiceError, validateRequired, validateEnum, stripUndefined, type ServiceContext } from './types';

import type { NewAnnotation } from '$lib/server/database';

const CONFIDENCE_VALUES = ['high', 'medium', 'low', 'guess'] as const;

// ============================================================================
// List
// ============================================================================

export async function listAnnotations(params: {
	uuid?: string;
	incident_id?: string;
	noted_by?: string;
	annotation_type?: string;
	created_at?: number;
	updated_at?: number;
	content?: string;
	confidence?: string;
	refers_to?: string;
	is_hypothesis?: boolean;
	tags?: string;
	include_deleted?: boolean;
}) {
	const conditions: SQL[] = [];

	if (params.uuid) conditions.push(eq(schema.annotations.uuid, params.uuid));
	if (params.incident_id) conditions.push(eq(schema.annotations.incident_id, params.incident_id));
	if (params.noted_by) conditions.push(eq(schema.annotations.noted_by, params.noted_by));
	if (params.annotation_type) conditions.push(eq(schema.annotations.annotation_type, params.annotation_type));
	if (params.created_at) conditions.push(eq(schema.annotations.created_at, params.created_at));
	if (params.updated_at) conditions.push(eq(schema.annotations.updated_at, params.updated_at));
	if (params.content) conditions.push(eq(schema.annotations.content, params.content));
	if (params.confidence) conditions.push(eq(schema.annotations.confidence, params.confidence as 'high' | 'medium' | 'low' | 'guess'));
	if (params.refers_to) conditions.push(eq(schema.annotations.refers_to, params.refers_to));
	if (params.is_hypothesis !== undefined) conditions.push(eq(schema.annotations.is_hypothesis, params.is_hypothesis));
	if (params.tags) conditions.push(eq(schema.annotations.tags, params.tags));

	// Filter out soft-deleted items unless explicitly requested
	if (!params.include_deleted) {
		conditions.push(isNull(schema.annotations.deleted_at));
	}

	return conditions.length > 0
		? await db.select().from(schema.annotations).where(and(...conditions))
		: await db.select().from(schema.annotations);
}

// ============================================================================
// Create
// ============================================================================

export async function createAnnotation(
	data: {
		incident_id: string;
		noted_by: string;
		annotation_type: string;
		content: string;
		confidence?: string;
		refers_to?: string;
		is_hypothesis?: boolean;
		tags?: string;
	},
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, [
		'incident_id',
		'noted_by',
		'annotation_type',
		'content'
	]);

	validateEnum('confidence', data.confidence, CONFIDENCE_VALUES);

	const annotationData: NewAnnotation = {
		incident_id: data.incident_id,
		noted_by: data.noted_by,
		annotation_type: data.annotation_type,
		content: data.content,
		confidence: data.confidence as NewAnnotation['confidence'],
		refers_to: data.refers_to,
		is_hypothesis: data.is_hypothesis,
		tags: data.tags
	};

	try {
		const [created] = await db
			.insert(schema.annotations)
			.values(annotationData)
			.returning();

		const io = getSocketIO();
		io.to(`incident:${data.incident_id}`).emit('entity-created', 'annotation', created);

		return created;
	} catch (err) {
		throw new ServiceError(500, 'DB_INSERT_ERROR', `Database insertion error: ${(err as Error).message}`);
	}
}

// ============================================================================
// Update
// ============================================================================

export async function updateAnnotation(
	data: {
		uuid: string;
		incident_id?: string;
		noted_by?: string;
		annotation_type?: string;
		content?: string;
		confidence?: string;
		refers_to?: string;
		is_hypothesis?: boolean;
		tags?: string;
	},
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);
	validateEnum('confidence', data.confidence, CONFIDENCE_VALUES);

	const { uuid, ...fields } = data;

	const cleanedData = stripUndefined({
		...fields,
		confidence: data.confidence as NewAnnotation['confidence'],
		updated_at: Math.floor(Date.now() / 1000)
	});

	try {
		const [updated] = await db
			.update(schema.annotations)
			.set(cleanedData)
			.where(eq(schema.annotations.uuid, uuid))
			.returning();

		if (!updated) {
			throw new ServiceError(404, 'NOT_FOUND', `Annotation ${uuid} not found`);
		}

		const io = getSocketIO();
		io.to(`incident:${data.incident_id}`).emit('entity-updated', 'annotation', updated);

		return updated;
	} catch (err) {
		if (err instanceof ServiceError) throw err;
		throw new ServiceError(500, 'DB_UPDATE_ERROR', `Database update error: ${(err as Error).message}`);
	}
}

// ============================================================================
// Delete (soft)
// ============================================================================

export async function deleteAnnotation(
	data: { uuid: string; incident_id?: string },
	ctx: ServiceContext
) {
	validateRequired(data as unknown as Record<string, unknown>, ['uuid']);

	try {
		await db
			.update(schema.annotations)
			.set({
				deleted_at: Math.floor(Date.now() / 1000),
				updated_at: Math.floor(Date.now() / 1000)
			})
			.where(eq(schema.annotations.uuid, data.uuid))
			.returning();

		const io = getSocketIO();
		if (data.incident_id) {
			io.to(`incident:${data.incident_id}`).emit('entity-deleted', 'annotation', data.uuid);
		}

		return true;
	} catch (err) {
		throw new ServiceError(500, 'DB_DELETE_ERROR', `Database deletion error: ${(err as Error).message}`);
	}
}
