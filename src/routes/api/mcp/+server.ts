/**
 * MCP Streamable HTTP Endpoint
 *
 * Handles the Model Context Protocol over Streamable HTTP transport.
 * - POST: Send JSON-RPC messages (initialize new session or continue existing)
 * - GET:  Open SSE stream for server-to-client notifications (existing session)
 * - DELETE: Terminate an existing session
 *
 * Authentication is enforced in hooks.server.ts and supports both API key
 * and Auth.js session authentication.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { buildServiceContext } from '$lib/server/auth/authorization';
import type { McpSessionOwner } from '$lib/server/mcp/session';
import { createSession, getSession, sessionMatchesOwner } from '$lib/server/mcp/session';
import { mcpLogger as logger } from '$lib/server/logging';

function buildSessionOwner(event: Parameters<RequestHandler>[0]): McpSessionOwner {
	const ctx = buildServiceContext(event);

	if (event.locals.apiKey) {
		return {
			authType: 'api_key',
			actorUUID: ctx.actorUUID,
			actorRole: ctx.actorRole,
			actorUserId: ctx.actorUserId,
			apiKeyId: event.locals.apiKey.id
		};
	}

	return {
		authType: 'session',
		actorUUID: ctx.actorUUID,
		actorRole: ctx.actorRole,
		actorUserId: ctx.actorUserId
	};
}

function getOwnedSession(event: Parameters<RequestHandler>[0], sessionId: string) {
	const session = getSession(sessionId);
	if (!session) {
		return {
			response: json({ error: 'Session not found or expired' }, { status: 404 })
		};
	}

	const owner = buildSessionOwner(event);
	if (!sessionMatchesOwner(session, owner)) {
		logger.warn('Rejected MCP session reuse by mismatched principal', {
			sessionId,
			expectedAuthType: session.owner.authType,
			expectedAnalystUUID: session.owner.actorUUID,
			actualAuthType: owner.authType,
			actualAnalystUUID: owner.actorUUID
		});

		return {
			response: json(
				{
					error: 'MCP session belongs to a different authenticated principal or outdated permissions. Start a new MCP session.'
				},
				{ status: 403 }
			)
		};
	}

	return { session };
}

/**
 * POST /api/mcp
 * Main JSON-RPC message handler. Creates a new session on first request
 * (no mcp-session-id header) or routes to an existing session.
 */
export const POST: RequestHandler = async (event) => {
	const sessionId = event.request.headers.get('mcp-session-id');
	const ctx = buildServiceContext(event);
	const owner = buildSessionOwner(event);

	try {
		if (sessionId) {
			const sessionResult = getOwnedSession(event, sessionId);
			if (sessionResult.response) {
				return sessionResult.response;
			}

			const response = await sessionResult.session.transport.handleRequest(event.request);
			return response;
		}

		// No session ID — create a new session and handle the initialize request
		const transport = createSession(ctx, owner);
		const response = await transport.handleRequest(event.request);

		logger.info('New MCP session created', {
			analystUUID: ctx.actorUUID,
			authType: owner.authType
		});
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
	const sessionId = event.request.headers.get('mcp-session-id');
	if (!sessionId) {
		return json({ error: 'mcp-session-id header required for GET requests' }, { status: 400 });
	}

	const sessionResult = getOwnedSession(event, sessionId);
	if (sessionResult.response) {
		return sessionResult.response;
	}

	try {
		const response = await sessionResult.session.transport.handleRequest(event.request);
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
	const sessionId = event.request.headers.get('mcp-session-id');
	if (!sessionId) {
		return json({ error: 'mcp-session-id header required for DELETE requests' }, { status: 400 });
	}

	const sessionResult = getOwnedSession(event, sessionId);
	if (sessionResult.response) {
		return sessionResult.response;
	}

	try {
		const response = await sessionResult.session.transport.handleRequest(event.request);
		return response;
	} catch (err) {
		logger.error('MCP DELETE error', { error: (err as Error).message, sessionId });
		return json({ error: 'Internal MCP error' }, { status: 500 });
	}
};
