/**
 * MCP Session Manager
 *
 * Manages stateful MCP sessions for the Streamable HTTP transport.
 * Each MCP client gets its own McpServer instance with tools scoped
 * to their authenticated identity.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { registerTools } from './tools';
import type { ServiceContext } from '$lib/server/services';
import { mcpLogger as logger } from '../logging';

interface McpSession {
	server: McpServer;
	transport: WebStandardStreamableHTTPServerTransport;
	analystUUID: string;
	analystRole: string;
	createdAt: number;
	lastAccessedAt: number;
}

const sessions = new Map<string, McpSession>();

// Session TTL: 30 minutes idle timeout
const SESSION_TTL_MS = 30 * 60 * 1000;

// Cleanup interval: every 5 minutes
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanupTimer(): void {
	if (cleanupInterval) return;
	cleanupInterval = setInterval(() => {
		const now = Date.now();
		for (const [sessionId, session] of sessions) {
			if (now - session.lastAccessedAt > SESSION_TTL_MS) {
				logger.info('Cleaning up stale MCP session', {
					sessionId,
					analystUUID: session.analystUUID
				});
				destroySession(sessionId);
			}
		}
	}, 5 * 60 * 1000);
}

export function createSession(ctx: ServiceContext): WebStandardStreamableHTTPServerTransport {
	startCleanupTimer();

	const server = new McpServer({
		name: 'timmyline',
		version: '1.0.0'
	});

	registerTools(server, ctx);

	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: () => crypto.randomUUID(),
		onsessioninitialized: (sessionId: string) => {
			logger.info('MCP session initialized', {
				sessionId,
				analystUUID: ctx.actorUUID
			});
			sessions.set(sessionId, {
				server,
				transport,
				analystUUID: ctx.actorUUID,
				analystRole: ctx.actorRole,
				createdAt: Date.now(),
				lastAccessedAt: Date.now()
			});
		},
		onsessionclosed: (sessionId: string) => {
			logger.info('MCP session closed by client', { sessionId });
			sessions.delete(sessionId);
		}
	});

	// Connect server to transport (this is async but we don't need to await —
	// the transport will buffer messages until connected)
	server.connect(transport);

	return transport;
}

export function getSession(sessionId: string): McpSession | undefined {
	const session = sessions.get(sessionId);
	if (session) {
		session.lastAccessedAt = Date.now();
	}
	return session;
}

export function destroySession(sessionId: string): boolean {
	const session = sessions.get(sessionId);
	if (!session) return false;

	try {
		session.transport.close();
		session.server.close();
	} catch (err) {
		logger.error('Error closing MCP session', {
			sessionId,
			error: (err as Error).message
		});
	}

	sessions.delete(sessionId);
	return true;
}

export function getActiveSessionCount(): number {
	return sessions.size;
}

export function getSessionInfo(): Array<{
	sessionId: string;
	analystUUID: string;
	createdAt: number;
	lastAccessedAt: number;
}> {
	return Array.from(sessions.entries()).map(([sessionId, s]) => ({
		sessionId,
		analystUUID: s.analystUUID,
		createdAt: s.createdAt,
		lastAccessedAt: s.lastAccessedAt
	}));
}
