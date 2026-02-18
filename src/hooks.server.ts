import { apiLogger } from '$lib/server/logging';
import { handle as authHandle } from '$lib/server/auth/config';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { authLogger as logger } from '$lib/server/logging';
import { validateApiKey } from '$lib/server/auth/apiKeys';

/**
 * API Key Authentication Hook
 * Checks for Bearer token before session auth. If a valid API key is found,
 * synthesizes a session so downstream auth helpers work unchanged.
 */
const apiKeyHandle: Handle = async ({ event, resolve }) => {
    const authHeader = event.request.headers.get('authorization');

    if (authHeader?.startsWith('Bearer tml_')) {
        const token = authHeader.slice('Bearer '.length);
        const keyInfo = await validateApiKey(token);

        if (!keyInfo) {
            return new Response(JSON.stringify({ error: 'Invalid or expired API key' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Determine effective role: minimum of key role and analyst role
        const effectiveRole = resolveEffectiveRole(keyInfo.keyRole, keyInfo.analystRole);

        // Store API key metadata for logging
        event.locals.apiKey = {
            id: keyInfo.keyId,
            name: keyInfo.keyName,
            analystUUID: keyInfo.analystUUID,
            analystUsername: keyInfo.analystUsername,
            analystRole: effectiveRole
        };

        // Synthesize a session so requireAuth/requireWriteAccess/etc. work unchanged
        const syntheticSession = {
            user: {
                name: keyInfo.analystFullName,
                email: keyInfo.analystEmail,
                analystUUID: keyInfo.analystUUID,
                analystRole: effectiveRole,
                analystUsername: keyInfo.analystUsername
            },
            expires: new Date(Date.now() + 86400000).toISOString()
        };

        event.locals.session = syntheticSession as any;
        event.locals.auth = async () => syntheticSession as any;

        logger.debug('API key authenticated', {
            keyName: keyInfo.keyName,
            onBehalfOf: keyInfo.analystUsername,
            effectiveRole
        });

        // Skip session auth and authorization redirect — go straight to resolution
        return resolve(event);
    }

    return resolve(event);
};

/**
 * Resolve the effective role: the lesser of the key's role and the analyst's actual role.
 * Hierarchy: 'on-point lead' > 'analyst' > 'observer' > 'read-only'
 */
function resolveEffectiveRole(keyRole: string | null, analystRole: string | null): string {
    const hierarchy = ['read-only', 'observer', 'analyst', 'on-point lead'];
    const keyLevel = hierarchy.indexOf(keyRole ?? 'read-only');
    const analystLevel = hierarchy.indexOf(analystRole ?? 'observer');
    return hierarchy[Math.min(keyLevel, analystLevel)];
}

/**
 * Authentication & Authorization Hook
 * Validates session and protects routes.
 * API key requests bypass redirect logic (already authenticated by apiKeyHandle).
 */
const authorizationHandle: Handle = async ({ event, resolve }) => {
    // API key requests are already authenticated — skip session/redirect checks
    if (event.locals.apiKey) {
        return resolve(event);
    }

    const session = await event.locals.auth();

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/auth', '/api/health'];
    const isPublicRoute = publicRoutes.some((route) => event.url.pathname.startsWith(route));
    const isRootRoute = event.url.pathname === '/';

    // Redirect unauthenticated users to login
    if (!session?.user && !isPublicRoute) {
        logger.debug('Unauthenticated access to protected route, redirecting to /login');
        throw redirect(303, '/login');
    }

    const toRouteFrom = ['/login'];
    // Redirect authenticated users away from login page
    if (session?.user && (toRouteFrom.some((route) => event.url.pathname === route))) {
        throw redirect(303, '/home');
    }

    // Attach session to locals for downstream use
    event.locals.session = session;

    return resolve(event);
};

/**
 * API Request Logging Hook
 * Logs all API requests with timing and error details
 */
const loggingHandle: Handle = async ({ event, resolve }) => {
    // Only log API calls
    if (!event.url.pathname.startsWith('/api/')) {
        return await resolve(event);
    }

    const requestId = crypto.randomUUID().slice(0, 8);
    const startTime = Date.now();

    // Include API key provenance in log context when present
    const apiKeyContext = event.locals.apiKey
        ? {
            via: 'api_key' as const,
            apiKeyName: event.locals.apiKey.name,
            onBehalfOf: event.locals.apiKey.analystUsername
        }
        : {};

    const log = apiLogger.child({
        requestId,
        path: event.url.pathname,
        method: event.request.method,
        ...apiKeyContext
    });

    event.locals.logger = log;

    try {
        const response = await resolve(event);
        const duration = Date.now() - startTime;

        if (response.status >= 400) {
            const cloned = response.clone();
            log.warn('API request completed with error status', {
                status: response.status,
                duration: `${duration}ms`,
                returnMessage: await cloned.text()
            });
            return response;
        }

        log.info('API request details: ', {
            status: response.status,
            duration: `${duration}ms`
        });

        return response;
    } catch (err) {
        log.error('API request failed', { error: (err as Error).message });
        throw err;
    }
};

// Chain hooks: API Key -> Auth -> Authorization -> Logging
// API key auth runs first; if present, it synthesizes a session and skips OAuth flow.
export const handle = sequence(apiKeyHandle, authHandle, authorizationHandle, loggingHandle);
