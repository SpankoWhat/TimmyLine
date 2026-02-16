import { apiLogger } from '$lib/server/logging';
import { handle as authHandle } from '$lib/server/auth/config';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { authLogger as logger } from '$lib/server/logging';

/**
 * Authentication & Authorization Hook
 * Validates session and protects routes
 */
const authorizationHandle: Handle = async ({ event, resolve }) => {
    const session = await event.locals.auth();

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/auth'];
    const isPublicRoute = publicRoutes.some((route) => event.url.pathname.startsWith(route));

    // Redirect unauthenticated users to login
    if (!session?.user && !isPublicRoute) {
        logger.debug('Unauthenticated access to protected route, redirecting to /login');
        throw redirect(303, '/login');
    }

    const toRouteFrom = ['/login', '/'];
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

    const log = apiLogger.child({
        requestId,
        path: event.url.pathname,
        method: event.request.method
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

// Chain hooks: Auth -> Authorization -> Logging
export const handle = sequence(authHandle, authorizationHandle, loggingHandle);
