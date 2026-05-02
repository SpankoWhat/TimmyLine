import { apiLogger } from '$lib/server/logging';
import { handle as authHandle } from '$lib/server/auth/config';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { authLogger as logger } from '$lib/server/logging';
import { validateApiKey } from '$lib/server/auth/apiKeys';
import {
    MicrosoftBearerTokenAuthError,
    validateMicrosoftBearerToken
} from '$lib/server/auth/microsoftBearerTokens';
import { initializeSocketIO } from '$lib/server/socket/index';

// ── Production Socket.IO bridge ─────────────────────────────────────
// In production, server.js stores the HTTP server on globalThis so we
// can attach Socket.IO from inside the SvelteKit build (where we have
// access to $lib/server, the DB, auth logic, etc.).
//
// In development, the Vite plugin handles this instead, so this block
// is a no-op — the global won't exist.
// ─────────────────────────────────────────────────────────────────────
const globalWithServer = globalThis as typeof globalThis & {
    __timmyline_server?: import('http').Server;
    __timmyline_socket_initialized?: boolean;
};

if (globalWithServer.__timmyline_server && !globalWithServer.__timmyline_socket_initialized) {
    initializeSocketIO(globalWithServer.__timmyline_server);
    globalWithServer.__timmyline_socket_initialized = true;
    logger.info('Socket.IO attached to production HTTP server via globalThis bridge');
}

/**
 * Resolve the effective role: the lesser of the key's role and the analyst's actual role.
 * Hierarchy: 'admin' > 'analyst' > 'reader'
 */
function resolveEffectiveRole(keyRole: string | null, analystRole: string | null): string {
    const hierarchy = ['reader', 'analyst', 'admin'];
    const keyLevel = hierarchy.indexOf(keyRole ?? 'reader');
    const analystLevel = hierarchy.indexOf(analystRole ?? 'reader');
    return hierarchy[Math.min(keyLevel, analystLevel)];
}

function isPublicRoute(pathname: string): boolean {
    const publicRoutes = ['/login', '/auth', '/api/health'];
    return publicRoutes.some((route) => pathname.startsWith(route)) || pathname === '/';
}

function isAdminRoute(pathname: string): boolean {
    return pathname === '/admin' || pathname.startsWith('/admin/');
}

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

function extractBearerToken(authHeader: string | null): string | null {
    if (!authHeader) {
        return null;
    }

    const [scheme, ...rest] = authHeader.split(' ');
    if (!scheme || scheme.toLowerCase() !== 'bearer') {
        return null;
    }

    const token = rest.join(' ').trim();
    return token.length > 0 ? token : null;
}

function setSyntheticSession(
    event: Parameters<Handle>[0]['event'],
    user: {
        id?: string;
        name?: string | null;
        email?: string | null;
        analystUUID: string;
        analystRole: string;
        analystUsername: string;
    }
) {
    const syntheticSession = {
        user,
        expires: new Date(Date.now() + 86400000).toISOString()
    };

    event.locals.session = syntheticSession as any;
    event.locals.auth = async () => syntheticSession as any;
}

/**
 * Credential Authentication Hook
 * Checks Authorization Bearer credentials before session auth.
 * - `tml_` tokens authenticate as TimmyLine API keys
 * - other Bearer tokens can authenticate as Microsoft Entra access tokens
 */
const credentialHandle: Handle = async ({ event, resolve }) => {
    if (!event.url.pathname.startsWith('/api/')) {
        return resolve(event);
    }

    const token = extractBearerToken(event.request.headers.get('authorization'));

    if (token?.startsWith('tml_')) {
        // Check if API key auth is enabled (reads from config file, hot-reloadable)
        const { getConfig } = await import('$lib/server/config');
        const config = getConfig();
        if (!config.auth.apiKeys.enabled) {
            return new Response(JSON.stringify({ error: 'API key authentication is disabled by administrator' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

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
            userId: keyInfo.userId,
            analystUUID: keyInfo.analystUUID,
            analystUsername: keyInfo.analystUsername,
            analystRole: effectiveRole
        };

        // Synthesize a session so requireAuth/requireWriteAccess/etc. work unchanged
        setSyntheticSession(event, {
            id: keyInfo.userId,
            name: keyInfo.analystFullName,
            email: keyInfo.analystEmail,
            analystUUID: keyInfo.analystUUID,
            analystRole: effectiveRole,
            analystUsername: keyInfo.analystUsername
        });

        logger.debug('API key authenticated', {
            keyName: keyInfo.keyName,
            onBehalfOf: keyInfo.analystUsername,
            effectiveRole
        });

        // Skip session auth and authorization redirect — go straight to resolution
        return resolve(event);
    }

    if (!token) {
        return resolve(event);
    }

    const { getConfig } = await import('$lib/server/config');
    const config = getConfig();
    if (!config.auth.microsoft.bearerToken.enabled) {
        return resolve(event);
    }

    try {
        const identity = await validateMicrosoftBearerToken(token);

        event.locals.bearerToken = {
            issuer: identity.issuer,
            subject: identity.subject,
            principal: identity.principal,
            principalClaim: identity.principalClaim,
            audience: identity.audience,
            userId: identity.userId,
            analystUUID: identity.analystUUID,
            analystUsername: identity.analystUsername,
            analystRole: identity.analystRole
        };

        setSyntheticSession(event, {
            id: identity.userId,
            name: identity.analystFullName ?? identity.name,
            email: identity.analystEmail ?? identity.principal,
            analystUUID: identity.analystUUID,
            analystRole: identity.analystRole,
            analystUsername: identity.analystUsername
        });

        logger.debug('Microsoft bearer token authenticated', {
            principal: identity.principal,
            principalClaim: identity.principalClaim,
            onBehalfOf: identity.analystUsername
        });

        return resolve(event);
    } catch (error) {
        if (error instanceof MicrosoftBearerTokenAuthError) {
            return new Response(JSON.stringify({ error: error.message, code: error.code }), {
                status: error.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        logger.error('Unexpected Microsoft bearer token authentication failure', {
            error: error instanceof Error ? error.message : String(error)
        });

        return new Response(JSON.stringify({ error: 'Internal authentication error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return resolve(event);
};

/**
 * Authentication & Authorization Hook
 * Validates session and protects routes.
 * API key requests bypass redirect logic (already authenticated by apiKeyHandle).
 */
const authorizationHandle: Handle = async ({ event, resolve }) => {
    // API key requests are already authenticated — skip session/redirect checks
    if (event.locals.apiKey || event.locals.bearerToken) {
        return resolve(event);
    }

    const session = await event.locals.auth();
    const isApiRequest = event.url.pathname.startsWith('/api/');

    // Public routes that don't require authentication
    const routeIsPublic = isPublicRoute(event.url.pathname);

    // API routes should return JSON errors instead of browser redirects.
    if (!session?.user && !routeIsPublic && isApiRequest) {
        logger.debug('Unauthenticated API access to protected route', {
            path: event.url.pathname
        });
        return jsonError('Authentication required', 401);
    }

    // Redirect unauthenticated browser users to login
    if (!session?.user && !routeIsPublic) {
        logger.debug('Unauthenticated access to protected route, redirecting to /login');
        throw redirect(303, '/login');
    }

    const toRouteFrom = ['/login', '/'];
    // Redirect authenticated users away from login/landing pages
    if (session?.user && (toRouteFrom.some((route) => event.url.pathname === route))) {
        throw redirect(303, '/home');
    }

    if (session?.user && isAdminRoute(event.url.pathname) && session.user.analystRole !== 'admin') {
        logger.debug('Non-admin attempted to access admin route, redirecting to /home', {
            path: event.url.pathname,
            actorRole: session.user.analystRole
        });
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
    const authContext = event.locals.apiKey
        ? {
            via: 'api_key' as const,
            apiKeyName: event.locals.apiKey.name,
            onBehalfOf: event.locals.apiKey.analystUsername
        }
        : event.locals.bearerToken
            ? {
                via: 'bearer_token' as const,
                principal: event.locals.bearerToken.principal,
                onBehalfOf: event.locals.bearerToken.analystUsername,
                issuer: event.locals.bearerToken.issuer,
                subject: event.locals.bearerToken.subject
            }
        : {};

    const log = apiLogger.child({
        requestId,
        path: event.url.pathname,
        method: event.request.method,
        ...authContext
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

// Chain hooks: Credentials -> Auth -> Authorization -> Logging
// Authorization Bearer credentials run first and can synthesize a session for downstream code.
export const handle = sequence(credentialHandle, authHandle, authorizationHandle, loggingHandle);
