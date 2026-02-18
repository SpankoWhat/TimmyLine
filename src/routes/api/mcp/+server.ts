/**
 * MCP Streamable HTTP Endpoint
 *
 * POST /api/mcp — Handle JSON-RPC messages (initialize, tools/list, tools/call, etc.)
 * GET  /api/mcp — SSE stream for server-initiated notifications (stateful sessions)
 * DELETE /api/mcp — Terminate a session
 *
 * All requests require API key authentication (Bearer tml_* token).
 * The transport handles session management, JSON-RPC routing, and SSE streaming.
 */

import type { RequestHandler } from './$types';
import { createSession, getSession } from '$lib/server/mcp/session';
import type { ServiceRole } from '$lib/server/services';

function getServiceContext(event: { locals: App.Locals }) {
	// API key auth populates both locals.apiKey and a synthetic locals.session
	const apiKey = event.locals.apiKey;
	if (apiKey) {
		return {
			actorUUID: apiKey.analystUUID,
			actorRole: apiKey.analystRole as ServiceRole,
			actorUserId: apiKey.userId
		};
	}
	const session = event.locals.session;
	return {
		actorUUID: session?.user?.analystUUID || 'unknown',
		actorRole: (session?.user?.analystRole || 'observer') as ServiceRole,
		actorUserId: session?.user?.id
	};
}

function requireApiKeyAuth(event: { locals: App.Locals }): Response | null {
	// MCP endpoint requires API key auth specifically
	if (!event.locals.apiKey) {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: {
					code: -32001,
					message:
						'Authentication required. Provide an API key via Authorization: tml_<key>'
				},
				id: null
			}),
			{
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
	return null;
}

export const POST: RequestHandler = async (event) => {
	const authError = requireApiKeyAuth(event);
	if (authError) return authError;

	const ctx = getServiceContext(event);
	const sessionId = event.request.headers.get('mcp-session-id');

	// If there's a session ID, try to route to existing session
	if (sessionId) {
		const existingSession = getSession(sessionId);
		if (existingSession) {
			return existingSession.transport.handleRequest(event.request);
		}
		// Session not found — could be expired or invalid
		// Fall through to create new transport which will handle the initialize message
	}

	// No session or session not found — create new transport for initialization
	const transport = createSession(ctx);
	return transport.handleRequest(event.request);
};

export const GET: RequestHandler = async (event) => {
	const authError = requireApiKeyAuth(event);
	if (authError) return authError;

	const sessionId = event.request.headers.get('mcp-session-id');
	if (!sessionId) {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: {
					code: -32000,
					message: 'Mcp-Session-Id header required for SSE stream'
				},
				id: null
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const existingSession = getSession(sessionId);
	if (!existingSession) {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: { code: -32000, message: 'Session not found or expired' },
				id: null
			}),
			{
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	return existingSession.transport.handleRequest(event.request);
};

export const DELETE: RequestHandler = async (event) => {
	const authError = requireApiKeyAuth(event);
	if (authError) return authError;

	const sessionId = event.request.headers.get('mcp-session-id');
	if (!sessionId) {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: { code: -32000, message: 'Mcp-Session-Id header required' },
				id: null
			}),
			{
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	const existingSession = getSession(sessionId);
	if (!existingSession) {
		return new Response(
			JSON.stringify({
				jsonrpc: '2.0',
				error: { code: -32000, message: 'Session not found' },
				id: null
			}),
			{
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}

	// Let the transport handle the DELETE for proper cleanup
	return existingSession.transport.handleRequest(event.request);
};
