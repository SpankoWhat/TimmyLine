import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { sql } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
    try {
        // Simple query to verify DB connection and responsiveness
        const result = await db.get<{ result: number }>(sql`SELECT 1 as result`);
        
        // Check if we got a valid response
        if (result?.result === 1) {
            return json({
                status: 'healthy',
                database: 'connected',
                timestamp: new Date().toISOString()
            });
        }

        // Unexpected response format
        return json(
            {
                status: 'degraded',
                database: 'unexpected_response',
                timestamp: new Date().toISOString()
            },
            { status: 503 }
        );
    } catch (err) {
        // Database connection failed
        return json(
            {
                status: 'unhealthy',
                database: 'disconnected',
                error: err instanceof Error ? err.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 503 }
        );
    }
};