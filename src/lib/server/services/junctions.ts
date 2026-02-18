import { db } from '$lib/server';
import * as schema from '$lib/server/database';
import { eq, and } from 'drizzle-orm';
import { getSocketIO } from '$lib/server/socket';
import { ServiceError, validateRequired, type ServiceContext, type JunctionTableName } from './types';

// ============================================================================
// Create — Event Entities
// ============================================================================

export async function createEventEntity(
	data: { event_uuid: string; entity_uuid: string; role?: string; context?: string; incident_id?: string },
	ctx: ServiceContext
) {
	const event_id = data.event_uuid;
	const entity_id = data.entity_uuid;

	validateRequired({ event_uuid: data.event_uuid, entity_uuid: data.entity_uuid }, ['event_uuid', 'entity_uuid']);

	const created = db
		.insert(schema.event_entities)
		.values({
			event_id,
			entity_id,
			role: data.role || null,
			context: data.context || null
		})
		.returning()
		.get();

	if (data.incident_id) {
		try {
			const io = getSocketIO();
			io.to(`incident:${data.incident_id}`).emit('entity-created', 'event_entities', created);
		} catch { /* Socket.IO not available */ }
	}

	return created;
}

// ============================================================================
// Create — Action Events
// ============================================================================

export async function createActionEvent(
	data: { action_uuid: string; event_uuid: string; relation_type: string; incident_id?: string },
	ctx: ServiceContext
) {
	const action_id = data.action_uuid;
	const event_id = data.event_uuid;

	validateRequired(
		{ action_uuid: data.action_uuid, event_uuid: data.event_uuid, relation_type: data.relation_type },
		['action_uuid', 'event_uuid', 'relation_type']
	);

	const created = db
		.insert(schema.action_events)
		.values({
			action_id,
			event_id,
			relation_type: data.relation_type
		})
		.returning()
		.get();

	if (data.incident_id) {
		try {
			const io = getSocketIO();
			io.to(`incident:${data.incident_id}`).emit('entity-created', 'action_events', created);
		} catch { /* Socket.IO not available */ }
	}

	return created;
}

// ============================================================================
// Create — Action Entities
// ============================================================================

export async function createActionEntity(
	data: { action_uuid: string; entity_uuid: string; relation_type: string; incident_id: string },
	ctx: ServiceContext
) {
	const action_id = data.action_uuid;
	const entity_id = data.entity_uuid;

	validateRequired(
		{ action_uuid: data.action_uuid, entity_uuid: data.entity_uuid, relation_type: data.relation_type, incident_id: data.incident_id },
		['action_uuid', 'entity_uuid', 'relation_type', 'incident_id']
	);

	const created = db
		.insert(schema.action_entities)
		.values({
			action_id,
			entity_id,
			relation_type: data.relation_type
		})
		.returning()
		.get();

	try {
		const io = getSocketIO();
		io.to(`incident:${data.incident_id}`).emit('entity-created', 'action_entities', created);
	} catch { /* Socket.IO not available */ }

	return created;
}

// ============================================================================
// Update — Event Entities
// ============================================================================

export async function updateEventEntity(
	data: { event_id: string; entity_id: string; role?: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['event_id', 'entity_id']);

	const updated = db
		.update(schema.event_entities)
		.set({ role: data.role })
		.where(
			and(
				eq(schema.event_entities.event_id, data.event_id),
				eq(schema.event_entities.entity_id, data.entity_id)
			)
		)
		.returning()
		.get();

	if (!updated) {
		throw new ServiceError(404, 'NOT_FOUND', 'Event-entity junction not found');
	}

	try {
		const io = getSocketIO();
		io.emit('junction-updated', 'event_entities', updated);
	} catch { /* Socket.IO not available */ }

	return updated;
}

// ============================================================================
// Update — Action Events
// ============================================================================

export async function updateActionEvent(
	data: { action_id: string; event_id: string; relation_type?: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['action_id', 'event_id']);

	const updated = db
		.update(schema.action_events)
		.set({ relation_type: data.relation_type })
		.where(
			and(
				eq(schema.action_events.action_id, data.action_id),
				eq(schema.action_events.event_id, data.event_id)
			)
		)
		.returning()
		.get();

	if (!updated) {
		throw new ServiceError(404, 'NOT_FOUND', 'Action-event junction not found');
	}

	try {
		const io = getSocketIO();
		io.emit('junction-updated', 'action_events', updated);
	} catch { /* Socket.IO not available */ }

	return updated;
}

// ============================================================================
// Update — Action Entities
// ============================================================================

export async function updateActionEntity(
	data: { action_id: string; entity_id: string; relation_type?: string },
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['action_id', 'entity_id']);

	const updated = db
		.update(schema.action_entities)
		.set({ relation_type: data.relation_type })
		.where(
			and(
				eq(schema.action_entities.action_id, data.action_id),
				eq(schema.action_entities.entity_id, data.entity_id)
			)
		)
		.returning()
		.get();

	if (!updated) {
		throw new ServiceError(404, 'NOT_FOUND', 'Action-entity junction not found');
	}

	try {
		const io = getSocketIO();
		io.emit('junction-updated', 'action_entities', updated);
	} catch { /* Socket.IO not available */ }

	return updated;
}

// ============================================================================
// Delete (hard)
// ============================================================================

const VALID_JUNCTION_TABLES: JunctionTableName[] = [
	'action_events',
	'event_entities',
	'action_entities',
	'annotation_references'
];

export async function deleteJunction(
	data: {
		table: string;
		action_id?: string;
		event_id?: string;
		entity_id?: string;
		annotation_id?: string;
		reference_id?: string;
		reference_type?: string;
	},
	ctx: ServiceContext
) {
	validateRequired(data as Record<string, unknown>, ['table']);

	if (!VALID_JUNCTION_TABLES.includes(data.table as JunctionTableName)) {
		throw new ServiceError(
			400,
			'INVALID_TABLE',
			`Invalid junction table: ${data.table}. Must be one of: ${VALID_JUNCTION_TABLES.join(', ')}`
		);
	}

	const table = data.table as JunctionTableName;

	switch (table) {
		case 'action_events': {
			validateRequired(data as Record<string, unknown>, ['action_id', 'event_id']);
			db.delete(schema.action_events)
				.where(
					and(
						eq(schema.action_events.action_id, data.action_id!),
						eq(schema.action_events.event_id, data.event_id!)
					)
				)
				.run();
			break;
		}
		case 'event_entities': {
			validateRequired(data as Record<string, unknown>, ['event_id', 'entity_id']);
			db.delete(schema.event_entities)
				.where(
					and(
						eq(schema.event_entities.event_id, data.event_id!),
						eq(schema.event_entities.entity_id, data.entity_id!)
					)
				)
				.run();
			break;
		}
		case 'action_entities': {
			validateRequired(data as Record<string, unknown>, ['action_id', 'entity_id']);
			db.delete(schema.action_entities)
				.where(
					and(
						eq(schema.action_entities.action_id, data.action_id!),
						eq(schema.action_entities.entity_id, data.entity_id!)
					)
				)
				.run();
			break;
		}
		case 'annotation_references': {
			validateRequired(data as Record<string, unknown>, ['annotation_id', 'reference_id', 'reference_type']);
			db.delete(schema.annotation_references)
				.where(
					and(
						eq(schema.annotation_references.annotation_id, data.annotation_id!),
						eq(schema.annotation_references.reference_id, data.reference_id!),
						eq(schema.annotation_references.reference_type, data.reference_type as 'event' | 'action' | 'entity' | 'incident')
					)
				)
				.run();
			break;
		}
	}

	return true;
}
