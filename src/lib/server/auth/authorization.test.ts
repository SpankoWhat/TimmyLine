import { describe, expect, it, vi } from 'vitest';

import {
	buildServiceContext,
	requireAdminAccess,
	requireAuth,
	requireWriteAccess
} from './authorization';

describe('authorization helpers', () => {
	it('buildServiceContext prefers API key identity over session identity', () => {
		const ctx = buildServiceContext({
			locals: {
				apiKey: {
					analystUUID: 'api-analyst',
					analystRole: 'reader',
					userId: 'api-user'
				},
				session: {
					user: {
						analystUUID: 'session-analyst',
						analystRole: 'admin',
						id: 'session-user'
					}
				}
			}
		} as never);

		expect(ctx).toEqual({
			actorUUID: 'api-analyst',
			actorRole: 'reader',
			actorUserId: 'api-user'
		});
	});

	it('buildServiceContext falls back to the authenticated session', () => {
		const ctx = buildServiceContext({
			locals: {
				session: {
					user: {
						analystUUID: 'session-analyst',
						analystRole: 'analyst',
						id: 'session-user'
					}
				}
			}
		} as never);

		expect(ctx).toEqual({
			actorUUID: 'session-analyst',
			actorRole: 'analyst',
			actorUserId: 'session-user'
		});
	});

	it('buildServiceContext uses bearer token identity before session identity', () => {
		const ctx = buildServiceContext({
			locals: {
				bearerToken: {
					analystUUID: 'bearer-analyst',
					analystRole: 'analyst',
					userId: 'bearer-user'
				},
				session: {
					user: {
						analystUUID: 'session-analyst',
						analystRole: 'admin',
						id: 'session-user'
					}
				}
			}
		} as never);

		expect(ctx).toEqual({
			actorUUID: 'bearer-analyst',
			actorRole: 'analyst',
			actorUserId: 'bearer-user'
		});
	});

	it('requireAuth rejects unauthenticated requests', async () => {
		await expect(
			requireAuth({
				locals: {
					auth: vi.fn().mockResolvedValue(null)
				}
			} as never)
		).rejects.toMatchObject({ status: 401 });
	});

	it('requireWriteAccess accepts analyst users', async () => {
		await expect(
			requireWriteAccess({
				locals: {
					auth: vi.fn().mockResolvedValue({
						user: { analystRole: 'analyst' }
					})
				}
			} as never)
		).resolves.toMatchObject({
			user: { analystRole: 'analyst' }
		});
	});

	it('requireAuth accepts synthesized locals.session without calling auth', async () => {
		const auth = vi.fn();

		await expect(
			requireAuth({
				locals: {
					session: {
						user: { analystRole: 'reader', analystUUID: 'analyst-1' }
					},
					auth
				}
			} as never)
		).resolves.toMatchObject({
			user: { analystRole: 'reader', analystUUID: 'analyst-1' }
		});

		expect(auth).not.toHaveBeenCalled();
	});

	it('requireAdminAccess rejects non-admin users', async () => {
		await expect(
			requireAdminAccess({
				locals: {
					auth: vi.fn().mockResolvedValue({
						user: { analystRole: 'reader' }
					})
				}
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});
});