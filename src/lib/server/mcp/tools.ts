/**
 * MCP Tool Registration
 *
 * Registers all TimmyLine tools on an McpServer instance.
 * Tools call service functions directly (in-process, no HTTP).
 * The ServiceContext captures the authenticated analyst making the request.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { db } from '$lib/server';
import { sql } from 'drizzle-orm';
import {
	listIncidents,
	createIncident,
	updateIncident,
	deleteIncident,
	listTimelineEvents,
	createTimelineEvent,
	updateTimelineEvent,
	deleteTimelineEvent,
	listInvestigationActions,
	createInvestigationAction,
	updateInvestigationAction,
	deleteInvestigationAction,
	listEntities,
	createEntity,
	updateEntity,
	deleteEntity,
	listAnnotations,
	createAnnotation,
	updateAnnotation,
	deleteAnnotation,
	listAnalysts,
	createAnalyst,
	updateAnalyst,
	deleteAnalyst,
	listLookups,
	createLookup,
	updateLookup,
	deleteLookup,
	createEventEntity,
	createActionEvent,
	createActionEntity,
	updateEventEntity,
	updateActionEvent,
	updateActionEntity,
	deleteJunction,
	getEnrichedTimeline,
	ServiceError,
	type ServiceContext
} from '$lib/server/services';
import { aggregateIncidentData } from '$lib/server/export/exportIncident';
import { renderExportHtml } from '$lib/server/export/exportTemplate';

// ============================================================================
// Helpers
// ============================================================================

function toolResult(data: unknown) {
	return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

async function safeTool(fn: () => Promise<unknown>) {
	try {
		const result = await fn();
		return toolResult(result);
	} catch (err) {
		if (err instanceof ServiceError) {
			return toolResult({ error: err.message, code: err.code, status: err.status });
		}
		return toolResult({ error: (err as Error).message });
	}
}

// ============================================================================
// Tool Registration
// ============================================================================

export function registerTools(server: McpServer, ctx: ServiceContext): void {
	const writeRoles = ['analyst', 'on-point lead'];

	// ========================================================================
	// READ Tools
	// ========================================================================

	// ── Health Check ─────────────────────────────────────────────────────

	server.registerTool(
		'health_check',
		{
			description: 'Check if the TimmyLine server is running and responsive'
		},
		async () => {
			try {
				const result = db.get(sql`SELECT 1 as result`);
				return toolResult({
					status: 'ok',
					database: 'connected',
					timestamp: new Date().toISOString(),
					result
				});
			} catch (err) {
				return toolResult({
					status: 'error',
					database: 'disconnected',
					error: (err as Error).message
				});
			}
		}
	);

	// ── List Incidents ───────────────────────────────────────────────────

	server.registerTool(
		'list_incidents',
		{
			description:
				'List all incidents, optionally filtered by uuid, title, status, priority, or SOAR ticket ID',
			inputSchema: {
				uuid: z.string().optional().describe('Filter by incident UUID'),
				soar_ticket_id: z.string().optional().describe('Filter by SOAR ticket ID'),
				title: z.string().optional().describe('Filter by exact title'),
				status: z
					.enum(['In Progress', 'Post-Mortem', 'Closed'])
					.optional()
					.describe('Filter by status'),
				priority: z
					.enum(['critical', 'high', 'medium', 'low'])
					.optional()
					.describe('Filter by priority'),
				include_deleted: z.boolean().optional().describe('Include soft-deleted incidents')
			}
		},
		async (params) => safeTool(() => listIncidents(params))
	);

	// ── List Timeline Events ─────────────────────────────────────────────

	server.registerTool(
		'list_timeline_events',
		{
			description:
				'List timeline events for an incident. Filter by uuid, incident_id, event_type, severity, confidence, source, etc.',
			inputSchema: {
				uuid: z.string().optional().describe('Filter by event UUID'),
				incident_id: z
					.string()
					.optional()
					.describe('Filter by incident UUID (required for incident-scoped queries)'),
				discovered_by: z
					.string()
					.optional()
					.describe('Filter by analyst UUID who discovered it'),
				event_type: z.string().optional().describe('Filter by event type name'),
				severity: z
					.enum(['critical', 'high', 'medium', 'low', 'info'])
					.optional()
					.describe('Filter by severity'),
				confidence: z
					.enum(['high', 'medium', 'low', 'guess'])
					.optional()
					.describe('Filter by confidence level'),
				source_reliability: z
					.enum(['A', 'B', 'C', 'D', 'E', 'F'])
					.optional()
					.describe('Filter by source reliability (A=best, F=worst)'),
				source: z.string().optional().describe('Filter by source name'),
				include_deleted: z.boolean().optional().describe('Include soft-deleted events')
			}
		},
		async (params) => safeTool(() => listTimelineEvents(params))
	);

	// ── Get Enriched Timeline ────────────────────────────────────────────

	server.registerTool(
		'get_enriched_timeline',
		{
			description:
				'Get the full enriched timeline for an incident — events with linked entities, and actions with linked events and entities. This is the richest view of an incident timeline.',
			inputSchema: {
				incident_id: z
					.string()
					.describe('The incident UUID to get the enriched timeline for'),
				include_deleted: z.boolean().optional().describe('Include soft-deleted items')
			}
		},
		async (params) => safeTool(() => getEnrichedTimeline(params))
	);

	// ── List Investigation Actions ───────────────────────────────────────

	server.registerTool(
		'list_investigation_actions',
		{
			description:
				'List investigation actions for an incident. Filter by uuid, action_type, result, tool_used, etc.',
			inputSchema: {
				uuid: z.string().optional().describe('Filter by action UUID'),
				incident_id: z.string().optional().describe('Filter by incident UUID'),
				action_type: z.string().optional().describe('Filter by action type name'),
				actioned_by: z
					.string()
					.optional()
					.describe('Filter by analyst UUID who performed it'),
				result: z
					.enum(['success', 'failed', 'partial', 'pending'])
					.optional()
					.describe('Filter by action result'),
				tool_used: z.string().optional().describe('Filter by tool used'),
				include_deleted: z.boolean().optional().describe('Include soft-deleted actions')
			}
		},
		async (params) => safeTool(() => listInvestigationActions(params))
	);

	// ── List Entities ────────────────────────────────────────────────────

	server.registerTool(
		'list_entities',
		{
			description:
				'List IOC/artifact entities for an incident. Filter by entity_type, identifier, status, criticality, etc.',
			inputSchema: {
				uuid: z.string().optional().describe('Filter by entity UUID'),
				incident_id: z.string().optional().describe('Filter by incident UUID'),
				entity_type: z
					.string()
					.optional()
					.describe('Filter by entity type (e.g. IP, domain, hash, user)'),
				identifier: z.string().optional().describe('Filter by exact identifier value'),
				display_name: z.string().optional().describe('Filter by display name'),
				status: z
					.enum(['active', 'inactive', 'unknown'])
					.optional()
					.describe('Filter by status'),
				criticality: z
					.enum(['critical', 'high', 'medium', 'low', 'unknown'])
					.optional()
					.describe('Filter by criticality'),
				include_deleted: z.boolean().optional().describe('Include soft-deleted entities')
			}
		},
		async (params) => safeTool(() => listEntities(params))
	);

	// ── List Annotations ─────────────────────────────────────────────────

	server.registerTool(
		'list_annotations',
		{
			description:
				'List analyst annotations/notes for an incident. Filter by annotation_type, confidence, hypothesis status, etc.',
			inputSchema: {
				uuid: z.string().optional().describe('Filter by annotation UUID'),
				incident_id: z.string().optional().describe('Filter by incident UUID'),
				noted_by: z.string().optional().describe('Filter by analyst UUID'),
				annotation_type: z.string().optional().describe('Filter by annotation type'),
				confidence: z
					.enum(['high', 'medium', 'low', 'guess'])
					.optional()
					.describe('Filter by confidence'),
				is_hypothesis: z.boolean().optional().describe('Filter to hypotheses only'),
				include_deleted: z
					.boolean()
					.optional()
					.describe('Include soft-deleted annotations')
			}
		},
		async (params) => safeTool(() => listAnnotations(params))
	);

	// ── List Analysts ────────────────────────────────────────────────────

	server.registerTool(
		'list_analysts',
		{
			description: 'List all analysts. Filter by username, role, active status, etc.',
			inputSchema: {
				uuid: z.string().optional().describe('Filter by analyst UUID'),
				username: z.string().optional().describe('Filter by username'),
				full_name: z.string().optional().describe('Filter by full name'),
				role: z
					.enum(['analyst', 'on-point lead', 'observer'])
					.optional()
					.describe('Filter by role'),
				active: z.boolean().optional().describe('Filter by active status'),
				include_deleted: z
					.boolean()
					.optional()
					.describe('Include soft-deleted analysts')
			}
		},
		async (params) => safeTool(() => listAnalysts(params))
	);

	// ── Read Lookup Table ────────────────────────────────────────────────

	server.registerTool(
		'list_lookup_values',
		{
			description:
				'Read all values from a lookup/reference table. Returns name + description for each entry.',
			inputSchema: {
				table: z
					.enum([
						'event_type',
						'action_type',
						'relation_type',
						'annotation_type',
						'entity_type'
					])
					.describe('Which lookup table to read')
			}
		},
		async (params) => safeTool(() => listLookups({ table: params.table }))
	);

	// ── Export Incident Data ─────────────────────────────────────────────

	server.registerTool(
		'export_incident_data',
		{
			description:
				'Get the full aggregated data export for an incident — includes all events, actions, entities, annotations, analysts, and lookup tables in a single payload. Useful for getting a complete overview of an incident.',
			inputSchema: {
				incident_id: z.string().describe('The incident UUID to export')
			}
		},
		async (params) =>
			safeTool(async () => {
				const payload = await aggregateIncidentData(params.incident_id);
				return payload;
			})
	);

	// ── Export Incident HTML ─────────────────────────────────────────────

	server.registerTool(
		'export_incident_html',
		{
			description:
				"Export a full incident as a self-contained interactive HTML report. Returns the raw HTML string that can be saved as an .html file and opened in a browser. Includes all events, actions, entities, annotations, and analysts rendered in TimmyLine's terminal-aesthetic UI. This tool returns a complete HTML document with embedded JavaScript. Save the response directly using Python's file.write() or the create_file tool to preserve exact encoding. Bash heredocs will corrupt the output.",
			inputSchema: {
				incident_id: z.string().describe('The incident UUID to export')
			}
		},
		async (params) => {
			try {
				const payload = await aggregateIncidentData(params.incident_id);
				const html = renderExportHtml(payload);
				return { content: [{ type: 'text' as const, text: html }] };
			} catch (err) {
				return toolResult({ error: (err as Error).message });
			}
		}
	);

	// ========================================================================
	// CREATE Tools
	// ========================================================================

	// ── Create Incident ──────────────────────────────────────────────────

	server.registerTool(
		'create_incident',
		{
			description:
				'Create a new incident. Returns the created incident with its auto-generated UUID.',
			inputSchema: {
				title: z.string().describe('Incident title'),
				status: z
					.enum(['In Progress', 'Post-Mortem', 'Closed'])
					.describe('Incident status'),
				priority: z
					.enum(['critical', 'high', 'medium', 'low'])
					.describe('Incident priority'),
				soar_ticket_id: z.string().optional().describe('Optional SOAR/ticket system ID')
			}
		},
		async (params) => safeTool(() => createIncident(params, ctx))
	);

	// ── Create Timeline Event ────────────────────────────────────────────

	server.registerTool(
		'create_timeline_event',
		{
			description:
				'Create a new timeline event on an incident. Timestamps are Unix epoch seconds.',
			inputSchema: {
				incident_id: z.string().describe('UUID of the parent incident'),
				discovered_by: z
					.string()
					.describe('UUID of the analyst who discovered this event'),
				event_type: z
					.string()
					.describe('Event type name (must exist in event_type lookup)'),
				discovered_at: z
					.number()
					.describe('When the event was discovered (Unix epoch seconds)'),
				event_data: z.string().describe('JSON string of structured event data'),
				note: z.string().optional().describe('Free-text notes about the event'),
				occurred_at: z
					.number()
					.optional()
					.describe('When the event actually occurred (Unix epoch seconds)'),
				severity: z
					.enum(['critical', 'high', 'medium', 'low', 'info'])
					.optional()
					.describe('Event severity'),
				confidence: z
					.enum(['high', 'medium', 'low', 'guess'])
					.optional()
					.describe('Confidence in this event'),
				source_reliability: z
					.enum(['A', 'B', 'C', 'D', 'E', 'F'])
					.optional()
					.describe('Source reliability rating'),
				source: z.string().optional().describe('Source of the event information'),
				tags: z.string().optional().describe('Comma-separated tags')
			}
		},
		async (params) => safeTool(() => createTimelineEvent(params, ctx))
	);

	// ── Create Investigation Action ──────────────────────────────────────

	server.registerTool(
		'create_investigation_action',
		{
			description:
				'Create a new investigation action on an incident. Timestamps are Unix epoch seconds.',
			inputSchema: {
				incident_id: z.string().describe('UUID of the parent incident'),
				actioned_by: z
					.string()
					.describe('UUID of the analyst performing the action'),
				action_type: z
					.string()
					.describe('Action type name (must exist in action_type lookup)'),
				performed_at: z
					.number()
					.describe('When the action was performed (Unix epoch seconds)'),
				action_data: z
					.string()
					.optional()
					.describe('JSON string of structured action data'),
				result: z
					.enum(['success', 'failed', 'partial', 'pending'])
					.optional()
					.describe('Action result'),
				tool_used: z.string().optional().describe('Tool or system used'),
				notes: z.string().optional().describe('Free-text notes about the action'),
				next_steps: z.string().optional().describe('Suggested next steps'),
				tags: z.string().optional().describe('Comma-separated tags')
			}
		},
		async (params) => safeTool(() => createInvestigationAction(params, ctx))
	);

	// ── Create Entity ────────────────────────────────────────────────────

	server.registerTool(
		'create_entity',
		{
			description:
				'Create a new IOC/artifact entity on an incident (IP, domain, hash, user, etc.).',
			inputSchema: {
				incident_id: z.string().describe('UUID of the parent incident'),
				entered_by: z
					.string()
					.describe('UUID of the analyst entering this entity'),
				entity_type: z
					.string()
					.describe('Entity type name (must exist in entity_type lookup)'),
				identifier: z
					.string()
					.describe(
						'The entity identifier value (e.g. the IP address, domain, hash)'
					),
				display_name: z
					.string()
					.optional()
					.describe('Human-friendly display name'),
				status: z
					.enum(['active', 'inactive', 'unknown'])
					.optional()
					.describe('Entity status'),
				criticality: z
					.enum(['critical', 'high', 'medium', 'low', 'unknown'])
					.optional()
					.describe('Entity criticality'),
				first_seen: z
					.number()
					.optional()
					.describe('First seen timestamp (Unix epoch seconds)'),
				last_seen: z
					.number()
					.optional()
					.describe('Last seen timestamp (Unix epoch seconds)'),
				attributes: z
					.string()
					.optional()
					.describe('JSON string of additional attributes'),
				tags: z.string().optional().describe('Comma-separated tags')
			}
		},
		async (params) => safeTool(() => createEntity(params, ctx))
	);

	// ── Create Annotation ────────────────────────────────────────────────

	server.registerTool(
		'create_annotation',
		{
			description: 'Create a new annotation/note on an incident.',
			inputSchema: {
				incident_id: z.string().describe('UUID of the parent incident'),
				noted_by: z
					.string()
					.describe('UUID of the analyst writing the annotation'),
				annotation_type: z
					.string()
					.describe('Annotation type name (must exist in annotation_type lookup)'),
				content: z.string().describe('The annotation content/text'),
				confidence: z
					.enum(['high', 'medium', 'low', 'guess'])
					.optional()
					.describe('Confidence level'),
				refers_to: z
					.string()
					.optional()
					.describe('UUID of the entity/event/action this refers to'),
				is_hypothesis: z
					.boolean()
					.optional()
					.describe('Whether this is a hypothesis'),
				tags: z.string().optional().describe('Comma-separated tags')
			}
		},
		async (params) => safeTool(() => createAnnotation(params, ctx))
	);

	// ── Create Analyst ───────────────────────────────────────────────────

	server.registerTool(
		'create_analyst',
		{
			description: 'Create a new analyst user.',
			inputSchema: {
				username: z.string().describe('Unique username'),
				full_name: z.string().optional().describe('Full display name'),
				role: z
					.enum(['analyst', 'on-point lead', 'observer'])
					.optional()
					.describe('Analyst role'),
				active: z.boolean().optional().describe('Whether the analyst is active')
			}
		},
		async (params) => safeTool(() => createAnalyst(params, ctx))
	);

	// ── Create Lookup Entry ──────────────────────────────────────────────

	server.registerTool(
		'create_lookup_entry',
		{
			description:
				'Add a new entry to a lookup/reference table (event_type, action_type, etc.).',
			inputSchema: {
				table: z
					.enum([
						'event_type',
						'action_type',
						'relation_type',
						'annotation_type',
						'entity_type'
					])
					.describe('Which lookup table to add to'),
				name: z.string().describe('The lookup value name'),
				description: z.string().describe('Description of this lookup value')
			}
		},
		async (params) => safeTool(() => createLookup(params, ctx))
	);

	// ── Create Junction: Event ↔ Entity ──────────────────────────────────

	server.registerTool(
		'link_event_entity',
		{
			description:
				'Link a timeline event to an entity (IOC/artifact). Creates an event_entities junction record.',
			inputSchema: {
				event_uuid: z.string().describe('UUID of the timeline event'),
				entity_uuid: z.string().describe('UUID of the entity'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (for Socket.IO broadcast)'),
				role: z
					.string()
					.optional()
					.describe(
						'Role of this entity in the event (e.g. source, target, indicator)'
					),
				context: z
					.string()
					.optional()
					.describe('Additional context about the relationship')
			}
		},
		async (params) => safeTool(() => createEventEntity(params, ctx))
	);

	// ── Create Junction: Action ↔ Event ──────────────────────────────────

	server.registerTool(
		'link_action_event',
		{
			description:
				'Link an investigation action to a timeline event. Creates an action_events junction record.',
			inputSchema: {
				action_uuid: z.string().describe('UUID of the investigation action'),
				event_uuid: z.string().describe('UUID of the timeline event'),
				relation_type: z
					.string()
					.describe('Relation type (must exist in relation_type lookup)'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (for Socket.IO broadcast)')
			}
		},
		async (params) => safeTool(() => createActionEvent(params, ctx))
	);

	// ── Create Junction: Action ↔ Entity ─────────────────────────────────

	server.registerTool(
		'link_action_entity',
		{
			description:
				'Link an investigation action to an entity. Creates an action_entities junction record.',
			inputSchema: {
				action_uuid: z.string().describe('UUID of the investigation action'),
				entity_uuid: z.string().describe('UUID of the entity'),
				relation_type: z
					.string()
					.describe('Relation type (must exist in relation_type lookup)'),
				incident_id: z
					.string()
					.describe('Incident UUID (required for Socket.IO broadcast)')
			}
		},
		async (params) => safeTool(() => createActionEntity(params, ctx))
	);

	// ========================================================================
	// UPDATE Tools
	// ========================================================================

	// ── Update Incident ──────────────────────────────────────────────────

	server.registerTool(
		'update_incident',
		{
			description:
				'Update an existing incident. Only the uuid is required; all other fields are optional and only provided fields will be changed.',
			inputSchema: {
				uuid: z.string().describe('UUID of the incident to update'),
				title: z.string().optional().describe('New title'),
				status: z
					.enum(['In Progress', 'Post-Mortem', 'Closed'])
					.optional()
					.describe('New status'),
				priority: z
					.enum(['critical', 'high', 'medium', 'low'])
					.optional()
					.describe('New priority'),
				soar_ticket_id: z.string().optional().describe('New SOAR ticket ID')
			}
		},
		async (params) => safeTool(() => updateIncident(params, ctx))
	);

	// ── Update Timeline Event ────────────────────────────────────────────

	server.registerTool(
		'update_timeline_event',
		{
			description:
				'Update an existing timeline event. Only the uuid is required; all other fields are optional.',
			inputSchema: {
				uuid: z.string().describe('UUID of the event to update'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (needed for broadcast)'),
				discovered_by: z
					.string()
					.optional()
					.describe('New discovering analyst UUID'),
				event_type: z.string().optional().describe('New event type'),
				discovered_at: z
					.number()
					.optional()
					.describe('New discovery timestamp (epoch seconds)'),
				occurred_at: z
					.number()
					.optional()
					.describe('New occurrence timestamp (epoch seconds)'),
				notes: z.string().optional().describe('Updated notes'),
				event_data: z.string().optional().describe('Updated JSON event data'),
				severity: z
					.enum(['critical', 'high', 'medium', 'low', 'info'])
					.optional()
					.describe('New severity'),
				confidence: z
					.enum(['high', 'medium', 'low', 'guess'])
					.optional()
					.describe('New confidence'),
				source_reliability: z
					.enum(['A', 'B', 'C', 'D', 'E', 'F'])
					.optional()
					.describe('New source reliability'),
				source: z.string().optional().describe('New source'),
				tags: z.string().optional().describe('Updated tags')
			}
		},
		async (params) => safeTool(() => updateTimelineEvent(params, ctx))
	);

	// ── Update Investigation Action ──────────────────────────────────────

	server.registerTool(
		'update_investigation_action',
		{
			description:
				'Update an existing investigation action. Only the uuid is required; all other fields are optional.',
			inputSchema: {
				uuid: z.string().describe('UUID of the action to update'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (needed for broadcast)'),
				actioned_by: z.string().optional().describe('New analyst UUID'),
				action_type: z.string().optional().describe('New action type'),
				performed_at: z
					.number()
					.optional()
					.describe('New performed timestamp (epoch seconds)'),
				action_data: z.string().optional().describe('Updated JSON action data'),
				result: z
					.enum(['success', 'failed', 'partial', 'pending'])
					.optional()
					.describe('New result'),
				tool_used: z.string().optional().describe('Updated tool used'),
				notes: z.string().optional().describe('Updated notes'),
				next_steps: z.string().optional().describe('Updated next steps'),
				tags: z.string().optional().describe('Updated tags')
			}
		},
		async (params) => safeTool(() => updateInvestigationAction(params, ctx))
	);

	// ── Update Entity ────────────────────────────────────────────────────

	server.registerTool(
		'update_entity',
		{
			description:
				'Update an existing entity. Only the uuid is required; all other fields are optional.',
			inputSchema: {
				uuid: z.string().describe('UUID of the entity to update'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (needed for broadcast)'),
				entered_by: z.string().optional().describe('New entering analyst UUID'),
				entity_type: z.string().optional().describe('New entity type'),
				identifier: z.string().optional().describe('New identifier value'),
				display_name: z.string().optional().describe('New display name'),
				status: z
					.enum(['active', 'inactive', 'unknown'])
					.optional()
					.describe('New status'),
				criticality: z
					.enum(['critical', 'high', 'medium', 'low', 'unknown'])
					.optional()
					.describe('New criticality'),
				first_seen: z.number().optional().describe('New first seen timestamp'),
				last_seen: z.number().optional().describe('New last seen timestamp'),
				attributes: z.string().optional().describe('Updated JSON attributes'),
				tags: z.string().optional().describe('Updated tags')
			}
		},
		async (params) => safeTool(() => updateEntity(params, ctx))
	);

	// ── Update Annotation ────────────────────────────────────────────────

	server.registerTool(
		'update_annotation',
		{
			description:
				'Update an existing annotation. Only the uuid is required; all other fields are optional.',
			inputSchema: {
				uuid: z.string().describe('UUID of the annotation to update'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (needed for broadcast)'),
				noted_by: z.string().optional().describe('New analyst UUID'),
				annotation_type: z.string().optional().describe('New annotation type'),
				content: z.string().optional().describe('Updated content text'),
				confidence: z
					.enum(['high', 'medium', 'low', 'guess'])
					.optional()
					.describe('New confidence'),
				refers_to: z.string().optional().describe('New reference UUID'),
				is_hypothesis: z.boolean().optional().describe('Update hypothesis flag'),
				tags: z.string().optional().describe('Updated tags')
			}
		},
		async (params) => safeTool(() => updateAnnotation(params, ctx))
	);

	// ── Update Analyst ───────────────────────────────────────────────────

	server.registerTool(
		'update_analyst',
		{
			description:
				'Update an existing analyst. Only the uuid is required; all other fields are optional.',
			inputSchema: {
				uuid: z.string().describe('UUID of the analyst to update'),
				username: z.string().optional().describe('New username'),
				full_name: z.string().optional().describe('New full name'),
				role: z
					.enum(['analyst', 'on-point lead', 'observer'])
					.optional()
					.describe('New role'),
				active: z.boolean().optional().describe('New active status')
			}
		},
		async (params) => safeTool(() => updateAnalyst(params, ctx))
	);

	// ── Update Lookup Entry ──────────────────────────────────────────────

	server.registerTool(
		'update_lookup_entry',
		{
			description:
				'Update an entry in a lookup/reference table. Provide old_name to identify the record.',
			inputSchema: {
				table: z
					.enum([
						'event_type',
						'action_type',
						'relation_type',
						'annotation_type',
						'entity_type'
					])
					.describe('Which lookup table'),
				old_name: z.string().describe('The current name of the entry to update'),
				name: z.string().describe('The new name'),
				description: z.string().describe('The new description')
			}
		},
		async (params) => safeTool(() => updateLookup(params, ctx))
	);

	// ── Update Junction: Event ↔ Entity ──────────────────────────────────

	server.registerTool(
		'update_event_entity_link',
		{
			description:
				'Update a link between a timeline event and an entity. Provide event_id and entity_id to identify the record.',
			inputSchema: {
				event_id: z.string().describe('UUID of the timeline event'),
				entity_id: z.string().describe('UUID of the entity'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (for Socket.IO broadcast)'),
				role: z
					.string()
					.optional()
					.describe('Updated role of this entity in the event'),
				context: z
					.string()
					.optional()
					.describe('Updated context about the relationship')
			}
		},
		async (params) => safeTool(() => updateEventEntity(params, ctx))
	);

	// ========================================================================
	// DELETE Tools
	// ========================================================================

	// ── Delete Incident ──────────────────────────────────────────────────

	server.registerTool(
		'delete_incident',
		{
			description:
				'Soft-delete an incident (sets deleted_at timestamp). Requires admin access.',
			inputSchema: {
				uuid: z.string().describe('UUID of the incident to delete')
			}
		},
		async (params) => {
			if (ctx.actorRole !== 'on-point lead') {
				return toolResult({
					error: 'Insufficient permissions: admin access required'
				});
			}
			return safeTool(() => deleteIncident(params, ctx));
		}
	);

	// ── Delete Timeline Event ────────────────────────────────────────────

	server.registerTool(
		'delete_timeline_event',
		{
			description: 'Soft-delete a timeline event (sets deleted_at timestamp).',
			inputSchema: {
				uuid: z.string().describe('UUID of the event to delete'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (for Socket.IO broadcast)')
			}
		},
		async (params) => {
			if (!writeRoles.includes(ctx.actorRole)) {
				return toolResult({
					error: 'Insufficient permissions: write access required'
				});
			}
			return safeTool(() => deleteTimelineEvent(params, ctx));
		}
	);

	// ── Delete Investigation Action ──────────────────────────────────────

	server.registerTool(
		'delete_investigation_action',
		{
			description:
				'Soft-delete an investigation action (sets deleted_at timestamp).',
			inputSchema: {
				uuid: z.string().describe('UUID of the action to delete'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (for Socket.IO broadcast)')
			}
		},
		async (params) => {
			if (!writeRoles.includes(ctx.actorRole)) {
				return toolResult({
					error: 'Insufficient permissions: write access required'
				});
			}
			return safeTool(() => deleteInvestigationAction(params, ctx));
		}
	);

	// ── Delete Entity ────────────────────────────────────────────────────

	server.registerTool(
		'delete_entity',
		{
			description: 'Soft-delete an entity (sets deleted_at timestamp).',
			inputSchema: {
				uuid: z.string().describe('UUID of the entity to delete'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (for Socket.IO broadcast)')
			}
		},
		async (params) => {
			if (!writeRoles.includes(ctx.actorRole)) {
				return toolResult({
					error: 'Insufficient permissions: write access required'
				});
			}
			return safeTool(() => deleteEntity(params, ctx));
		}
	);

	// ── Delete Annotation ────────────────────────────────────────────────

	server.registerTool(
		'delete_annotation',
		{
			description: 'Soft-delete an annotation (sets deleted_at timestamp).',
			inputSchema: {
				uuid: z.string().describe('UUID of the annotation to delete'),
				incident_id: z
					.string()
					.optional()
					.describe('Incident UUID (for Socket.IO broadcast)')
			}
		},
		async (params) => {
			if (!writeRoles.includes(ctx.actorRole)) {
				return toolResult({
					error: 'Insufficient permissions: write access required'
				});
			}
			return safeTool(() => deleteAnnotation(params, ctx));
		}
	);

	// ── Delete Analyst ───────────────────────────────────────────────────

	server.registerTool(
		'delete_analyst',
		{
			description: 'Soft-delete an analyst (sets deleted_at timestamp).',
			inputSchema: {
				uuid: z.string().describe('UUID of the analyst to delete')
			}
		},
		async (params) => {
			if (!writeRoles.includes(ctx.actorRole)) {
				return toolResult({
					error: 'Insufficient permissions: write access required'
				});
			}
			return safeTool(() => deleteAnalyst(params, ctx));
		}
	);

	// ── Delete Lookup Entry ──────────────────────────────────────────────

	server.registerTool(
		'delete_lookup_entry',
		{
			description:
				'Delete an entry from a lookup/reference table. This is a hard delete.',
			inputSchema: {
				table: z
					.enum([
						'event_type',
						'action_type',
						'relation_type',
						'annotation_type',
						'entity_type'
					])
					.describe('Which lookup table'),
				name: z.string().describe('Name of the lookup entry to delete')
			}
		},
		async (params) => {
			if (!writeRoles.includes(ctx.actorRole)) {
				return toolResult({
					error: 'Insufficient permissions: write access required'
				});
			}
			return safeTool(() => deleteLookup(params, ctx));
		}
	);

	// ── Delete Junction Record ───────────────────────────────────────────

	server.registerTool(
		'unlink_junction',
		{
			description:
				'Remove a junction/relationship record. Specify the table and the composite key fields.',
			inputSchema: {
				table: z
					.enum([
						'action_events',
						'event_entities',
						'action_entities',
						'annotation_references'
					])
					.describe('Which junction table'),
				action_id: z
					.string()
					.optional()
					.describe('Action UUID (for action_events, action_entities)'),
				event_id: z
					.string()
					.optional()
					.describe('Event UUID (for action_events, event_entities)'),
				entity_id: z
					.string()
					.optional()
					.describe('Entity UUID (for event_entities, action_entities)'),
				annotation_id: z
					.string()
					.optional()
					.describe('Annotation UUID (for annotation_references)'),
				reference_id: z
					.string()
					.optional()
					.describe('Reference UUID (for annotation_references)'),
				reference_type: z
					.string()
					.optional()
					.describe('Reference type (for annotation_references)')
			}
		},
		async (params) => {
			if (!writeRoles.includes(ctx.actorRole)) {
				return toolResult({
					error: 'Insufficient permissions: write access required'
				});
			}
			return safeTool(() => deleteJunction(params, ctx));
		}
	);
}
