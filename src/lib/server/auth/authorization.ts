import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { ServiceContext, ServiceRole } from '$lib/server/services/types';

type AnalystRole = 'reader' | 'analyst' | 'admin';

/**
 * Verifies the user is authenticated and extracts session info.
 * Returns the session or throws 401.
 */
export async function requireAuth(event: RequestEvent) {
    if (event.locals.session?.user) {
        return event.locals.session;
    }

    const session = event.locals.auth ? await event.locals.auth() : null;
    if (!session?.user) {
        throw error(401, 'Authentication required');
    }
    return session;
}

/**
 * Verifies the user has one of the required roles.
 * Throws 403 if the user's role is not in the allowed list.
 */
export async function requireRole(event: RequestEvent, allowedRoles: AnalystRole[]) {
    const session = await requireAuth(event);
    const userRole = session.user?.analystRole as AnalystRole | undefined;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
        throw error(403, `Insufficient permissions. Required role: ${allowedRoles.join(' or ')}`);
    }
    
    return session;
}

/**
 * Read-only access: all authenticated users
 */
export async function requireReadAccess(event: RequestEvent) {
    return requireAuth(event);
}

/**
 * Write access: analysts and admins
 */
export async function requireWriteAccess(event: RequestEvent) {
    return requireRole(event, ['analyst', 'admin']);
}

/**
 * Admin/management access: admins only
 */
export async function requireAdminAccess(event: RequestEvent) {
    return requireRole(event, ['admin']);
}

// ============================================================================
// Service Context Builder
// ============================================================================

/**
 * Build a ServiceContext from a RequestEvent.
 * Checks both API key auth (locals.apiKey) and session auth (locals.session).
 * API key auth takes precedence when both are present.
 *
 * Use this in all API route handlers instead of inline context construction.
 */
export function buildServiceContext(event: RequestEvent): ServiceContext {
    // API key auth populates locals.apiKey
    const apiKey = event.locals.apiKey;
    if (apiKey) {
        return {
            actorUUID: apiKey.analystUUID,
            actorRole: apiKey.analystRole as ServiceRole,
            actorUserId: apiKey.userId
        };
    }

    const bearerToken = event.locals.bearerToken;
    if (bearerToken) {
        return {
            actorUUID: bearerToken.analystUUID,
            actorRole: bearerToken.analystRole as ServiceRole,
            actorUserId: bearerToken.userId
        };
    }

    // Fall back to session auth
    const session = event.locals.session;
    return {
        actorUUID: session?.user?.analystUUID || 'unknown',
        actorRole: (session?.user?.analystRole || 'reader') as ServiceRole,
        actorUserId: session?.user?.id
    };
}
