/**
 * Service Layer Types
 *
 * Shared types used across all service modules. Services are the single
 * source of truth for database operations, validation, and Socket.IO
 * broadcasting. Both API routes and MCP tool handlers call into services.
 */

// ============================================================================
// Service Context — who is performing the operation
// ============================================================================

export type ServiceRole = 'analyst' | 'on-point lead' | 'observer' | 'read-only';

export interface ServiceContext {
	/** UUID of the analyst performing the action */
	actorUUID: string;
	/** Effective role (min of API key role and analyst role) */
	actorRole: ServiceRole;
	/** Auth user ID who owns the session or API key */
	actorUserId?: string;
}

// ============================================================================
// Service Error — typed errors that callers map to HTTP/MCP responses
// ============================================================================

export class ServiceError extends Error {
	/** HTTP-equivalent status code (400, 404, 409, 500) */
	status: number;
	/** Machine-readable error code */
	code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = 'ServiceError';
		this.status = status;
		this.code = code;
	}
}

// ============================================================================
// Lookup table name union — shared across lookup and junction services
// ============================================================================

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

// ============================================================================
// Helpers
// ============================================================================

/**
 * Strip undefined values from an object (used before DB updates).
 */
export function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(obj).filter(([_, v]) => v !== undefined)
	) as Partial<T>;
}

/**
 * Validate that required fields are present and non-empty.
 * Throws ServiceError(400) listing missing fields.
 */
export function validateRequired(
	body: Record<string, unknown>,
	requiredKeys: string[]
): void {
	const missing = requiredKeys.filter(
		(k) => body[k] === undefined || body[k] === null || body[k] === ''
	);
	if (missing.length > 0) {
		throw new ServiceError(400, 'MISSING_FIELDS', `Missing required fields: ${missing.join(', ')}`);
	}
}

/**
 * Validate that a value is in an allowed set.
 * Throws ServiceError(400) if not.
 */
export function validateEnum(
	fieldName: string,
	value: unknown,
	allowed: readonly string[]
): void {
	if (value !== undefined && value !== null && value !== '' && !allowed.includes(value as string)) {
		throw new ServiceError(
			400,
			'INVALID_ENUM',
			`Invalid ${fieldName}: must be one of ${allowed.join(', ')}`
		);
	}
}
