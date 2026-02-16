import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

type AnalystRole = 'analyst' | 'on-point lead' | 'observer';

/**
 * Verifies the user is authenticated and extracts session info.
 * Returns the session or throws 401.
 */
export async function requireAuth(event: RequestEvent) {
    const session = await event.locals.auth();
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
 * Write access: analysts and on-point leads
 */
export async function requireWriteAccess(event: RequestEvent) {
    return requireRole(event, ['analyst', 'on-point lead']);
}

/**
 * Admin/management access: on-point leads only
 */
export async function requireAdminAccess(event: RequestEvent) {
    return requireRole(event, ['on-point lead']);
}
