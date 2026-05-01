import { describe, expect, it } from 'vitest';

import { sessionMatchesOwner, type McpSession, type McpSessionOwner } from './session';

function createOwner(overrides: Partial<McpSessionOwner> = {}): McpSessionOwner {
	return {
		authType: 'session',
		actorUUID: 'analyst-1',
		actorRole: 'analyst',
		actorUserId: 'user-1',
		...overrides
	};
}

function createSession(owner: McpSessionOwner): McpSession {
	return {
		server: {} as McpSession['server'],
		transport: {} as McpSession['transport'],
		owner,
		analystUUID: owner.actorUUID,
		analystRole: owner.actorRole,
		createdAt: Date.now(),
		lastAccessedAt: Date.now()
	};
}

describe('sessionMatchesOwner', () => {
	it('accepts the same session-backed principal', () => {
		const owner = createOwner();
		const session = createSession(owner);

		expect(sessionMatchesOwner(session, owner)).toBe(true);
	});

	it('rejects a different auth type for the same actor', () => {
		const session = createSession(createOwner({ authType: 'session' }));
		const apiKeyOwner = createOwner({ authType: 'api_key', apiKeyId: 'key-1' });

		expect(sessionMatchesOwner(session, apiKeyOwner)).toBe(false);
	});

	it('rejects a different actor role for the same identity', () => {
		const session = createSession(createOwner({ actorRole: 'reader' }));
		const owner = createOwner({ actorRole: 'admin' });

		expect(sessionMatchesOwner(session, owner)).toBe(false);
	});

	it('requires the same API key when auth type is api_key', () => {
		const session = createSession(
			createOwner({ authType: 'api_key', apiKeyId: 'key-1' })
		);
		const sameActorDifferentKey = createOwner({ authType: 'api_key', apiKeyId: 'key-2' });

		expect(sessionMatchesOwner(session, sameActorDifferentKey)).toBe(false);
	});
});