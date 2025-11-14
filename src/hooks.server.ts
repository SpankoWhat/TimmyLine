import { apiLogger } from '$lib/server/logging';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    
    // No need to log events (for now) that are not API calls
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
            log.warn('API request completed with error status', { status: response.status, duration: `${duration}ms`, returnMessage: await response.text() });
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
}