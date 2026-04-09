export interface AnalystIdentityLike {
	uuid: string;
	full_name?: string | null;
	username?: string | null;
}

export type AnalystLookup =
	| Map<string, AnalystIdentityLike>
	| Record<string, AnalystIdentityLike | undefined>
	| AnalystIdentityLike[];

function resolveAnalyst(
	analystUuid: string,
	lookup?: AnalystLookup
): AnalystIdentityLike | undefined {
	if (!lookup) {
		return undefined;
	}

	if (lookup instanceof Map) {
		return lookup.get(analystUuid);
	}

	if (Array.isArray(lookup)) {
		return lookup.find((analyst) => analyst.uuid === analystUuid);
	}

	return lookup[analystUuid];
}

export function enrichAnalystUuid(
	analystUuid: string | null | undefined,
	lookup?: AnalystLookup
): string {
	if (!analystUuid) {
		return '—';
	}

	const analyst = resolveAnalyst(analystUuid, lookup);
	if (!analyst) {
		return analystUuid;
	}

	const fullName = typeof analyst.full_name === 'string' ? analyst.full_name.trim() : '';
	if (fullName) {
		return fullName;
	}

	const username = typeof analyst.username === 'string' ? analyst.username.trim() : '';
	if (username) {
		return username;
	}

	return analystUuid;
}