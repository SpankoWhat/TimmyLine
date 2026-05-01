import { describe, expect, it } from 'vitest';

import {
	ServiceError,
	requireActorUserId,
	requireAdminServiceAccess,
	requireExportServiceAccess,
	requireReadServiceAccess,
	requireWriteServiceAccess
} from './types';

describe('service RBAC helpers', () => {
	it('allows read access for authenticated readers', () => {
		expect(() =>
			requireReadServiceAccess({
				actorUUID: 'analyst-1',
				actorRole: 'reader'
			})
		).not.toThrow();
	});

	it('rejects write access for readers', () => {
		try {
			requireWriteServiceAccess({
				actorUUID: 'analyst-1',
				actorRole: 'reader'
			});
			throw new Error('expected write access to be denied');
		} catch (err) {
			expect(err).toBeInstanceOf(ServiceError);
			expect(err).toMatchObject({
				status: 403,
				code: 'INSUFFICIENT_PERMISSIONS'
			});
		}
	});

	it('rejects admin access for analysts', () => {
		try {
			requireAdminServiceAccess({
				actorUUID: 'analyst-1',
				actorRole: 'analyst'
			});
			throw new Error('expected admin access to be denied');
		} catch (err) {
			expect(err).toBeInstanceOf(ServiceError);
			expect(err).toMatchObject({
				status: 403,
				code: 'INSUFFICIENT_PERMISSIONS'
			});
		}
	});

	it('rejects export access for readers', () => {
		try {
			requireExportServiceAccess({
				actorUUID: 'analyst-1',
				actorRole: 'reader'
			});
			throw new Error('expected export access to be denied');
		} catch (err) {
			expect(err).toBeInstanceOf(ServiceError);
			expect(err).toMatchObject({
				status: 403,
				code: 'INSUFFICIENT_PERMISSIONS'
			});
		}
	});

	it('allows export access for analysts', () => {
		expect(() =>
			requireExportServiceAccess({
				actorUUID: 'analyst-1',
				actorRole: 'analyst'
			})
		).not.toThrow();
	});

	it('rejects unauthenticated service contexts', () => {
		try {
			requireReadServiceAccess({
				actorUUID: 'unknown',
				actorRole: 'reader'
			});
			throw new Error('expected auth to be required');
		} catch (err) {
			expect(err).toBeInstanceOf(ServiceError);
			expect(err).toMatchObject({
				status: 401,
				code: 'AUTH_REQUIRED'
			});
		}
	});

	it('requires an actor user id when requested', () => {
		expect(
			requireActorUserId({
				actorUUID: 'analyst-1',
				actorRole: 'admin',
				actorUserId: 'user-1'
			})
		).toBe('user-1');

		try {
			requireActorUserId({
				actorUUID: 'analyst-1',
				actorRole: 'admin'
			});
			throw new Error('expected actor user id to be required');
		} catch (err) {
			expect(err).toBeInstanceOf(ServiceError);
			expect(err).toMatchObject({
				status: 401,
				code: 'AUTH_REQUIRED'
			});
		}
	});
});