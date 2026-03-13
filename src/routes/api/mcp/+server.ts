/**
 * MCP Streamable HTTP Endpoint
 *
 * Handles the Model Context Protocol over Streamable HTTP transport.
 * - POST: Send JSON-RPC messages (initialize new session or continue existing)
 * - GET:  Open SSE stream for server-to-client notifications (existing session)
 * - DELETE: Terminate an existing session
 *
 * Authentication is enforced via API key (checked in hooks.server.ts apiKeyHandle).
 * The /api/mcp path is listed as a public route so unauthenticated requests
 * don't get redirected to /login — but they'll still fail here without a valid key.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import { createSession, getSession } from '$lib/server/mcp/session';
import { mcpLogger as logger } from '$lib/server/logging';

/**
 * POST /api/mcp
 * Main JSON-RPC message handler. Creates a new session on first request
 * (no mcp-session-id header) or routes to an existing session.
 */
export const POST: RequestHandler = async (event) => {
	// Require API key authentication
	if (!event.locals.apiKey) {
		return json({ error: 'API key authentication required for MCP endpoint' }, { status: 401 });
	}

	const sessionId = event.request.headers.get('mcp-session-id');
	const ctx = buildServiceContext(event);

	try {
		if (sessionId) {
			// Route to existing session
			const session = getSession(sessionId);
			if (!session) {
				return json({ error: 'Session not found or expired' }, { status: 404 });
			}

			const response = await session.transport.handleRequest(event.request);
			return response;
		}

		// No session ID — create a new session and handle the initialize request
		const transport = createSession(ctx);
		const response = await transport.handleRequest(event.request);

		logger.info('New MCP session created', { analystUUID: ctx.actorUUID });
		return response;
	} catch (err) {
		logger.error('MCP POST error', { error: (err as Error).message, sessionId });
		return json({ error: 'Internal MCP error' }, { status: 500 });
	}
};

/**
 * GET /api/mcp
 * Opens an SSE stream for server-to-client notifications on an existing session.
 */
export const GET: RequestHandler = async (event) => {
	if (!event.locals.apiKey) {
		return json({ error: 'API key authentication required for MCP endpoint' }, { status: 401 });
	}

	const sessionId = event.request.headers.get('mcp-session-id');
	if (!sessionId) {
		return json({ error: 'mcp-session-id header required for GET requests' }, { status: 400 });
	}

	const session = getSession(sessionId);
	if (!session) {
		return json({ error: 'Session not found or expired' }, { status: 404 });
	}

	try {
		const response = await session.transport.handleRequest(event.request);
		return response;
	} catch (err) {
		logger.error('MCP GET error', { error: (err as Error).message, sessionId });
		return json({ error: 'Internal MCP error' }, { status: 500 });
	}
};

/**
 * DELETE /api/mcp
 * Terminates an existing MCP session.
 */
export const DELETE: RequestHandler = async (event) => {
	if (!event.locals.apiKey) {
		return json({ error: 'API key authentication required for MCP endpoint' }, { status: 401 });
	}

	const sessionId = event.request.headers.get('mcp-session-id');
	if (!sessionId) {
		return json({ error: 'mcp-session-id header required for DELETE requests' }, { status: 400 });
	}

	const session = getSession(sessionId);
	if (!session) {
		return json({ error: 'Session not found or expired' }, { status: 404 });
	}

	try {
		const response = await session.transport.handleRequest(event.request);
		return response;
	} catch (err) {
		logger.error('MCP DELETE error', { error: (err as Error).message, sessionId });
		return json({ error: 'Internal MCP error' }, { status: 500 });
	}
};
