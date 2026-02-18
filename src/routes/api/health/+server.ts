import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server';
import { sql } from 'drizzle-orm';
import { getMcpStatus } from '$lib/server/mcp/state';

export const GET: RequestHandler = async () => {
    try {
        // Check database connection
        const result = await db.get<{ result: number }>(sql`SELECT 1 as result`);
        
        // Check MCP server status
        const mcpStatus = getMcpStatus();

        // Check if we got a valid database response
        if (result?.result === 1) {
            return json({
                status: 'healthy',
                database: 'connected',
                mcp: mcpStatus.running ? 'running' : 'stopped',
                mcpPid: mcpStatus.pid,
                mcpError: mcpStatus.lastError,
                timestamp: new Date().toISOString()
            });
        }

        // Unexpected response format
        return json(
            {
                status: 'degraded',
                database: 'unexpected_response',
                mcp: mcpStatus.running ? 'running' : 'stopped',
                mcpPid: mcpStatus.pid,
                timestamp: new Date().toISOString()
            },
            { status: 503 }
        );
    } catch (err) {
        // Database connection failed
        const mcpStatus = getMcpStatus();
        return json(
            {
                status: 'unhealthy',
                database: 'disconnected',
                mcp: mcpStatus.running ? 'running' : 'stopped',
                mcpPid: mcpStatus.pid,
                error: err instanceof Error ? err.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 503 }
        );
    }
};