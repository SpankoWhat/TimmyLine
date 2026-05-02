import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	buildServiceContext: vi.fn(),
	createSession: vi.fn(),
	getSession: vi.fn(),
	refreshSessionContext: vi.fn(),
	sessionMatchesOwner: vi.fn(),
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

vi.mock('$lib/server/auth/authorization', () => ({
	buildServiceContext: mocks.buildServiceContext
}));

vi.mock('$lib/server/mcp/session', () => ({
	createSession: mocks.createSession,
	getSession: mocks.getSession,
	refreshSessionContext: mocks.refreshSessionContext,
	sessionMatchesOwner: mocks.sessionMatchesOwner
}));

vi.mock('$lib/server/logging', () => ({
	mcpLogger: mocks.logger
}));

import { DELETE, GET, POST } from './+server';

function createEvent(
	method: 'GET' | 'POST' | 'DELETE',
	options: {
		sessionId?: string;
		apiKeyId?: string;
		bearerToken?: {
			issuer: string;
			subject: string;
		};
	} = {}
) {
	const headers = new Headers();
	if (options.sessionId) {
		headers.set('mcp-session-id', options.sessionId);
	}

	return {
		request: new Request('http://localhost/api/mcp', { method, headers }),
		locals: options.apiKeyId
			? {
					apiKey: { id: options.apiKeyId }
				}
			: options.bearerToken
				? {
						bearerToken: options.bearerToken
					}
				: {}
	} as Parameters<typeof POST>[0];
}

function createContext(overrides: Record<string, unknown> = {}) {
	return {
		actorUUID: 'analyst-1',
		actorRole: 'analyst' as const,
		actorUserId: 'user-1',
		...overrides
	};
}

afterEach(() => {
	vi.clearAllMocks();
});

describe('/api/mcp handlers', () => {
	it('refreshes session context before handling an existing POST request', async () => {
		const ctx = createContext({ actorRole: 'admin' });
		const session = {
			owner: {
				authType: 'session',
				actorUUID: ctx.actorUUID,
				actorRole: ctx.actorRole,
				actorUserId: ctx.actorUserId
			},
			transport: {
				handleRequest: vi.fn().mockResolvedValue(new Response('ok'))
			}
		};

		mocks.buildServiceContext.mockReturnValue(ctx);
		mocks.getSession.mockReturnValue(session);
		mocks.sessionMatchesOwner.mockReturnValue(true);

		const response = await POST(createEvent('POST', { sessionId: 'session-1' }));

		expect(mocks.refreshSessionContext).toHaveBeenCalledWith(session, ctx);
		expect(session.transport.handleRequest).toHaveBeenCalledTimes(1);
		expect(response.status).toBe(200);
	});

	it('creates a new session using the current request identity', async () => {
		const ctx = createContext();
		const transport = {
			handleRequest: vi.fn().mockResolvedValue(new Response('created', { status: 201 }))
		};

		mocks.buildServiceContext.mockReturnValue(ctx);
		mocks.createSession.mockReturnValue(transport);

		const response = await POST(createEvent('POST'));

		expect(mocks.createSession).toHaveBeenCalledWith(ctx, {
			authType: 'session',
			actorUUID: ctx.actorUUID,
			actorRole: ctx.actorRole,
			actorUserId: ctx.actorUserId
		});
		expect(mocks.refreshSessionContext).not.toHaveBeenCalled();
		expect(response.status).toBe(201);
	});

	it('creates a new session owned by the current bearer token principal', async () => {
		const ctx = createContext();
		const transport = {
			handleRequest: vi.fn().mockResolvedValue(new Response('created', { status: 201 }))
		};

		mocks.buildServiceContext.mockReturnValue(ctx);
		mocks.createSession.mockReturnValue(transport);

		const response = await POST(
			createEvent('POST', {
				bearerToken: {
					issuer: 'https://login.microsoftonline.com/tenant/v2.0',
					subject: 'subject-1'
				}
			})
		);

		expect(mocks.createSession).toHaveBeenCalledWith(ctx, {
			authType: 'bearer_token',
			actorUUID: ctx.actorUUID,
			actorRole: ctx.actorRole,
			actorUserId: ctx.actorUserId,
			bearerIssuer: 'https://login.microsoftonline.com/tenant/v2.0',
			bearerSubject: 'subject-1'
		});
		expect(response.status).toBe(201);
	});

	it('returns 403 when an existing session is reused by a mismatched principal', async () => {
		const ctx = createContext();
		const session = {
			owner: {
				authType: 'session',
				actorUUID: 'someone-else',
				actorRole: 'admin',
				actorUserId: 'user-2'
			},
			transport: {
				handleRequest: vi.fn()
			}
		};

		mocks.buildServiceContext.mockReturnValue(ctx);
		mocks.getSession.mockReturnValue(session);
		mocks.sessionMatchesOwner.mockReturnValue(false);

		const response = await GET(createEvent('GET', { sessionId: 'session-1' }));
		const payload = await response.json();

		expect(mocks.refreshSessionContext).not.toHaveBeenCalled();
		expect(response.status).toBe(403);
		expect(payload.error).toContain('different authenticated principal');
	});

	it('refreshes session context before handling DELETE requests', async () => {
		const ctx = createContext({ actorRole: 'reader' });
		const session = {
			owner: {
				authType: 'api_key',
				actorUUID: ctx.actorUUID,
				actorRole: ctx.actorRole,
				actorUserId: ctx.actorUserId,
				apiKeyId: 'key-1'
			},
			transport: {
				handleRequest: vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
			}
		};

		mocks.buildServiceContext.mockReturnValue(ctx);
		mocks.getSession.mockReturnValue(session);
		mocks.sessionMatchesOwner.mockReturnValue(true);

		const response = await DELETE(createEvent('DELETE', { sessionId: 'session-1', apiKeyId: 'key-1' }));

		expect(mocks.refreshSessionContext).toHaveBeenCalledWith(session, ctx);
		expect(response.status).toBe(204);
	});
});