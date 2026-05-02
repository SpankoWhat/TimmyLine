import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getConfig: vi.fn(),
	jwtVerify: vi.fn(),
	createRemoteJWKSet: vi.fn(),
	limit: vi.fn(),
	fetch: vi.fn()
}));

vi.mock('$lib/server/config', () => ({
	getConfig: mocks.getConfig
}));

vi.mock('$lib/server/logging', () => ({
	authLogger: {
		warn: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	}
}));

vi.mock('jose', () => ({
	createRemoteJWKSet: mocks.createRemoteJWKSet,
	jwtVerify: mocks.jwtVerify
}));

vi.mock('$lib/server', () => ({
	db: {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: mocks.limit
				}))
			}))
		}))
	}
}));

import {
	MicrosoftBearerTokenAuthError,
	validateMicrosoftBearerToken
} from './microsoftBearerTokens';

function createConfig(overrides: Record<string, unknown> = {}) {
	return {
		logging: {
			filePath: './data/timmyLine.log',
			writeToFile: false
		},
		auth: {
			microsoft: {
				bearerToken: {
					enabled: true,
					tenantId: 'tenant-id',
					audience: 'api://timmyline',
					issuer: '',
					discoveryUrl: '',
					jwksUri: ''
				},
				...overrides
			}
		}
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getConfig.mockReturnValue(createConfig());
	mocks.createRemoteJWKSet.mockReturnValue('remote-jwks');
	mocks.fetch.mockResolvedValue({
		ok: true,
		json: async () => ({
			issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
			jwks_uri: 'https://example.test/jwks'
		})
	});
	global.fetch = mocks.fetch as typeof fetch;
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('validateMicrosoftBearerToken', () => {
	it('validates a delegated Microsoft token and maps it to an active analyst', async () => {
		mocks.jwtVerify.mockResolvedValue({
			payload: {
				iss: 'https://login.microsoftonline.com/tenant-id/v2.0',
				aud: 'api://timmyline',
				sub: 'subject-1',
				tid: 'tenant-id',
				oid: 'object-1',
				preferred_username: 'analyst@example.com',
				name: 'Analyst Example',
				exp: 4102444800
			}
		});
		mocks.limit.mockResolvedValue([
			{
				uuid: 'analyst-uuid',
				userId: 'user-1',
				username: 'analyst',
				email: 'analyst@example.com',
				fullName: 'Analyst Example',
				role: 'analyst',
				active: true,
				deletedAt: null
			}
		]);

		const identity = await validateMicrosoftBearerToken('token-value');

		expect(identity).toMatchObject({
			issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
			subject: 'subject-1',
			principal: 'analyst@example.com',
			principalClaim: 'preferred_username',
			analystUUID: 'analyst-uuid',
			analystUsername: 'analyst',
			analystRole: 'analyst',
			userId: 'user-1'
		});
		expect(mocks.jwtVerify).toHaveBeenCalledWith('token-value', 'remote-jwks', {
			issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
			audience: 'api://timmyline',
			algorithms: ['RS256']
		});
	});

	it('rejects app-only Microsoft tokens in phase 1', async () => {
		mocks.jwtVerify.mockResolvedValue({
			payload: {
				iss: 'https://login.microsoftonline.com/tenant-id/v2.0',
				aud: 'api://timmyline',
				sub: 'subject-1',
				tid: 'tenant-id',
				idtyp: 'app',
				exp: 4102444800
			}
		});

		await expect(validateMicrosoftBearerToken('token-value')).rejects.toMatchObject({
			status: 401,
			code: 'MICROSOFT_BEARER_UNSUPPORTED_PRINCIPAL'
		});
	});

	it('rejects tokens that do not map to an active analyst', async () => {
		mocks.jwtVerify.mockResolvedValue({
			payload: {
				iss: 'https://login.microsoftonline.com/tenant-id/v2.0',
				aud: 'api://timmyline',
				sub: 'subject-1',
				tid: 'tenant-id',
				email: 'analyst@example.com',
				exp: 4102444800
			}
		});
		mocks.limit.mockResolvedValue([
			{
				uuid: 'analyst-uuid',
				userId: 'user-1',
				username: 'analyst',
				email: 'analyst@example.com',
				fullName: 'Analyst Example',
				role: 'analyst',
				active: false,
				deletedAt: null
			}
		]);

		await expect(validateMicrosoftBearerToken('token-value')).rejects.toMatchObject({
			status: 401,
			code: 'MICROSOFT_BEARER_ANALYST_INACTIVE'
		});
	});

	it('returns a 503 when bearer auth is enabled without an audience', async () => {
		mocks.getConfig.mockReturnValue(
			createConfig({
				bearerToken: {
					enabled: true,
					tenantId: 'tenant-id',
					audience: '',
					issuer: '',
					discoveryUrl: '',
					jwksUri: ''
				}
			})
		);

		await expect(validateMicrosoftBearerToken('token-value')).rejects.toMatchObject({
			status: 503,
			code: 'MICROSOFT_BEARER_MISCONFIGURED'
		});
	});

	it('normalizes signature and audience failures to a 401 auth error', async () => {
		mocks.jwtVerify.mockRejectedValue(new Error('unexpected aud claim'));

		const result = validateMicrosoftBearerToken('token-value');

		await expect(result).rejects.toBeInstanceOf(MicrosoftBearerTokenAuthError);
		await expect(result).rejects.toMatchObject({
			status: 401,
			code: 'MICROSOFT_BEARER_INVALID'
		});
	});
});