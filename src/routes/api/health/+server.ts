import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { sql } from 'drizzle-orm';
import { getActiveSessionCount } from '$lib/server/mcp/session';

export const GET: RequestHandler = async () => {
    try {
        // Check database connection
        const result = await db.get<{ result: number }>(sql`SELECT 1 as result`);

        // Check MCP session count
        const mcpSessions = getActiveSessionCount();

        // Check if we got a valid database response
        if (result?.result === 1) {
            return json({
                status: 'healthy',
                database: 'connected',
                mcp: 'streamable-http',
                mcpActiveSessions: mcpSessions,
                timestamp: new Date().toISOString()
            });
        }

        // Unexpected response format
        return json(
            {
                status: 'degraded',
                database: 'unexpected_response',
                mcp: 'streamable-http',
                mcpActiveSessions: mcpSessions,
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
                mcp: 'streamable-http',
                error: err instanceof Error ? err.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 503 }
        );
    }
};