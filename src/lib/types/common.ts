/**
 * Shared types used across client SDK and server services.
 * These live outside $lib/server/ so they can be imported by client code.
 */

export type ServiceRole = 'reader' | 'analyst' | 'admin';

export interface ServiceContext {
	/** UUID of the analyst performing the action */
	actorUUID: string;
	/** Effective role (min of API key role and analyst role) */
	actorRole: ServiceRole;
	/** Auth user ID who owns the session or API key */
	actorUserId?: string;
}

export type LookupTableName =
	| 'event_type'
	| 'action_type'
	| 'relation_type'
	| 'annotation_type'
	| 'entity_type';

export type JunctionTableName =
	| 'action_events'
	| 'event_entities'
	| 'action_entities'
	| 'annotation_references';
