import { env } from '$env/dynamic/private';
import { db } from '$lib/server';
import { analysts } from '$lib/server/database';
import { getConfig } from '$lib/server/config';
import { authLogger as logger } from '$lib/server/logging';
import type { ServiceRole } from '$lib/types/common';
import { or, sql } from 'drizzle-orm';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

type PrincipalClaimSource = 'email' | 'preferred_username' | 'upn' | 'unique_name';

interface MicrosoftBearerTokenSettings {
	enabled: boolean;
	tenantId?: string;
	audience?: string;
	issuer?: string;
	discoveryUrl?: string;
	jwksUri?: string;
}

interface ResolvedMicrosoftBearerTokenSettings {
	enabled: boolean;
	tenantId: string;
	audience: string;
	issuer: string;
	discoveryUrl?: string;
	jwksUri?: string;
}

interface PrincipalCandidate {
	source: PrincipalClaimSource;
	value: string;
	normalizedValue: string;
}

interface OpenIdConfiguration {
	issuer?: string;
	jwks_uri?: string;
}

const SERVICE_ROLES = new Set<ServiceRole>(['reader', 'analyst', 'admin']);

const globalForMicrosoftBearer = globalThis as typeof globalThis & {
	__timmylineMicrosoftBearer?: {
		discoveryCache: Map<string, Promise<OpenIdConfiguration>>;
		jwksCache: Map<string, ReturnType<typeof createRemoteJWKSet>>;
	};
};

if (!globalForMicrosoftBearer.__timmylineMicrosoftBearer) {
	globalForMicrosoftBearer.__timmylineMicrosoftBearer = {
		discoveryCache: new Map(),
		jwksCache: new Map()
	};
}

export interface MicrosoftBearerTokenIdentity {
	issuer: string;
	subject: string;
	tenantId: string;
	audience: string;
	principal: string;
	principalClaim: PrincipalClaimSource;
	objectId?: string;
	name: string;
	analystUUID: string;
	analystUsername: string;
	analystRole: ServiceRole;
	analystEmail?: string;
	analystFullName?: string;
	userId?: string;
}

export class MicrosoftBearerTokenAuthError extends Error {
	status: number;
	code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = 'MicrosoftBearerTokenAuthError';
		this.status = status;
		this.code = code;
	}
}

function normalizeOptionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePrincipalValue(value: string): string {
	return value.trim().toLowerCase();
}

function createPrincipalCandidates(payload: JWTPayload): PrincipalCandidate[] {
	const claims: Array<[PrincipalClaimSource, unknown]> = [
		['email', payload.email],
		['preferred_username', payload['preferred_username']],
		['upn', payload['upn']],
		['unique_name', payload['unique_name']]
	];

	const seen = new Set<string>();
	const candidates: PrincipalCandidate[] = [];

	for (const [source, rawValue] of claims) {
		const value = normalizeOptionalString(rawValue);
		if (!value) {
			continue;
		}

		const normalizedValue = normalizePrincipalValue(value);
		if (seen.has(normalizedValue)) {
			continue;
		}

		seen.add(normalizedValue);
		candidates.push({ source, value, normalizedValue });
	}

	return candidates;
}

function getBearerSettings(): MicrosoftBearerTokenSettings {
	const config = getConfig();
	return config.auth.microsoft.bearerToken;
}

export function getMicrosoftBearerTokenSettings(): ResolvedMicrosoftBearerTokenSettings {
	const settings = getBearerSettings();

	if (!settings.enabled) {
		return {
			enabled: false,
			tenantId: '',
			audience: '',
			issuer: ''
		};
	}

	const tenantId = normalizeOptionalString(settings.tenantId) ?? normalizeOptionalString(env.MICROSOFT_ENTRA_ID_TENANT_ID);
	const audience = normalizeOptionalString(settings.audience) ?? normalizeOptionalString(env.MICROSOFT_ENTRA_ID_API_AUDIENCE);
	const issuer = normalizeOptionalString(settings.issuer)
		?? (tenantId ? `https://login.microsoftonline.com/${tenantId}/v2.0` : undefined);
	const discoveryUrl = normalizeOptionalString(settings.discoveryUrl)
		?? (issuer ? `${issuer}/.well-known/openid-configuration` : undefined);
	const jwksUri = normalizeOptionalString(settings.jwksUri);

	if (!tenantId) {
		throw new MicrosoftBearerTokenAuthError(
			503,
			'MICROSOFT_BEARER_MISCONFIGURED',
			'Microsoft bearer token authentication is enabled but no tenant ID is configured'
		);
	}

	if (!audience) {
		throw new MicrosoftBearerTokenAuthError(
			503,
			'MICROSOFT_BEARER_MISCONFIGURED',
			'Microsoft bearer token authentication is enabled but no API audience is configured'
		);
	}

	if (!issuer) {
		throw new MicrosoftBearerTokenAuthError(
			503,
			'MICROSOFT_BEARER_MISCONFIGURED',
			'Microsoft bearer token authentication is enabled but no issuer is configured'
		);
	}

	if (!jwksUri && !discoveryUrl) {
		throw new MicrosoftBearerTokenAuthError(
			503,
			'MICROSOFT_BEARER_MISCONFIGURED',
			'Microsoft bearer token authentication is enabled but neither discovery nor JWKS metadata is configured'
		);
	}

	return {
		enabled: true,
		tenantId,
		audience,
		issuer,
		discoveryUrl,
		jwksUri
	};
}

async function fetchOpenIdConfiguration(discoveryUrl: string): Promise<OpenIdConfiguration> {
	const cache = globalForMicrosoftBearer.__timmylineMicrosoftBearer!.discoveryCache;
	const existing = cache.get(discoveryUrl);
	if (existing) {
		return existing;
	}

	const request = (async () => {
		const response = await fetch(discoveryUrl, {
			headers: {
				accept: 'application/json'
			}
		});

		if (!response.ok) {
			throw new MicrosoftBearerTokenAuthError(
				503,
				'MICROSOFT_BEARER_METADATA_UNAVAILABLE',
				`Failed to load Microsoft OpenID configuration (${response.status})`
			);
		}

		return response.json() as Promise<OpenIdConfiguration>;
	})();

	cache.set(discoveryUrl, request);

	try {
		return await request;
	} catch (error) {
		cache.delete(discoveryUrl);
		throw error;
	}
	}

async function resolveJwksUri(settings: ResolvedMicrosoftBearerTokenSettings): Promise<string> {
	if (settings.jwksUri) {
		return settings.jwksUri;
	}

	const discoveryUrl = settings.discoveryUrl;
	if (!discoveryUrl) {
		throw new MicrosoftBearerTokenAuthError(
			503,
			'MICROSOFT_BEARER_MISCONFIGURED',
			'Microsoft bearer token authentication is enabled but no discovery URL is configured'
		);
	}

	const metadata = await fetchOpenIdConfiguration(discoveryUrl);
	const discoveredIssuer = normalizeOptionalString(metadata.issuer);
	if (discoveredIssuer && discoveredIssuer !== settings.issuer) {
		throw new MicrosoftBearerTokenAuthError(
			503,
			'MICROSOFT_BEARER_MISCONFIGURED',
			'Microsoft bearer token discovery metadata returned an unexpected issuer'
		);
		}

	const discoveredJwksUri = normalizeOptionalString(metadata.jwks_uri);
	if (!discoveredJwksUri) {
		throw new MicrosoftBearerTokenAuthError(
			503,
			'MICROSOFT_BEARER_METADATA_UNAVAILABLE',
			'Microsoft bearer token discovery metadata did not include a JWKS URI'
		);
	}

	return discoveredJwksUri;
}

function getRemoteJwks(jwksUri: string) {
	const cache = globalForMicrosoftBearer.__timmylineMicrosoftBearer!.jwksCache;
	const existing = cache.get(jwksUri);
	if (existing) {
		return existing;
	}

	const remoteJwks = createRemoteJWKSet(new URL(jwksUri));
	cache.set(jwksUri, remoteJwks);
	return remoteJwks;
}

async function resolveAnalystForPrincipalCandidates(candidates: PrincipalCandidate[]) {
	if (candidates.length === 0) {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_IDENTITY_MISSING',
			'Microsoft bearer token did not include a supported user identity claim'
		);
	}

	const emailPredicates = candidates.map((candidate) => sql`lower(${analysts.email}) = ${candidate.normalizedValue}`);
	const emailClause = emailPredicates.length === 1 ? emailPredicates[0] : or(...emailPredicates)!;

	const matches = await db
		.select({
			uuid: analysts.uuid,
			userId: analysts.user_id,
			username: analysts.username,
			email: analysts.email,
			fullName: analysts.full_name,
			role: analysts.role,
			active: analysts.active,
			deletedAt: analysts.deleted_at
		})
		.from(analysts)
		.where(emailClause)
		.limit(2);

	if (matches.length === 0) {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_ANALYST_UNMAPPED',
			'Microsoft bearer token does not map to an existing TimmyLine analyst'
		);
	}

	if (matches.length > 1) {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_ANALYST_AMBIGUOUS',
			'Microsoft bearer token maps to more than one TimmyLine analyst'
		);
	}

	const analyst = matches[0];
	if (!analyst.active || analyst.deletedAt !== null) {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_ANALYST_INACTIVE',
			'Microsoft bearer token maps to an inactive TimmyLine analyst'
		);
	}

	if (!analyst.role || !SERVICE_ROLES.has(analyst.role as ServiceRole)) {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_ANALYST_INVALID',
			'Microsoft bearer token maps to a TimmyLine analyst without a valid role'
		);
	}

	const normalizedEmail = normalizeOptionalString(analyst.email)
		? normalizePrincipalValue(analyst.email!)
		: undefined;
	const matchedPrincipal = candidates.find((candidate) => candidate.normalizedValue === normalizedEmail) ?? candidates[0];

	return {
		uuid: analyst.uuid,
		userId: analyst.userId ?? undefined,
		username: analyst.username,
		email: analyst.email ?? undefined,
		fullName: analyst.fullName ?? undefined,
		role: analyst.role as ServiceRole,
		matchedPrincipal
	};
}

export async function validateMicrosoftBearerToken(token: string): Promise<MicrosoftBearerTokenIdentity> {
	const settings = getMicrosoftBearerTokenSettings();
	if (!settings.enabled) {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_DISABLED',
			'Microsoft bearer token authentication is disabled'
		);
	}

	const jwksUri = await resolveJwksUri(settings);
	const remoteJwks = getRemoteJwks(jwksUri);

	let payload: JWTPayload;
	try {
		const verified = await jwtVerify(token, remoteJwks, {
			issuer: settings.issuer,
			audience: settings.audience,
			algorithms: ['RS256']
		});
		payload = verified.payload;
	} catch (error) {
		logger.warn('Microsoft bearer token verification failed', {
			error: error instanceof Error ? error.message : String(error)
		});

		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_INVALID',
			'Invalid or expired Microsoft Entra bearer token'
		);
	}

	if (payload['idtyp'] === 'app') {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_UNSUPPORTED_PRINCIPAL',
			'App-only Microsoft Entra bearer tokens are not supported in phase 1'
		);
	}

	const subject = normalizeOptionalString(payload.sub);
	if (!subject) {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_SUBJECT_MISSING',
			'Microsoft bearer token is missing the required subject claim'
		);
	}

	const tokenTenantId = normalizeOptionalString(payload['tid']);
	if (tokenTenantId && tokenTenantId !== settings.tenantId) {
		throw new MicrosoftBearerTokenAuthError(
			401,
			'MICROSOFT_BEARER_TENANT_MISMATCH',
			'Microsoft bearer token was issued for an unexpected tenant'
		);
	}

	const analyst = await resolveAnalystForPrincipalCandidates(createPrincipalCandidates(payload));

	return {
		issuer: settings.issuer,
		subject,
		tenantId: tokenTenantId ?? settings.tenantId,
		audience: settings.audience,
		principal: analyst.matchedPrincipal.value,
		principalClaim: analyst.matchedPrincipal.source,
		objectId: normalizeOptionalString(payload['oid']),
		name: normalizeOptionalString(payload.name) ?? analyst.fullName ?? analyst.username,
		analystUUID: analyst.uuid,
		analystUsername: analyst.username,
		analystRole: analyst.role,
		analystEmail: analyst.email,
		analystFullName: analyst.fullName,
		userId: analyst.userId
	};
}