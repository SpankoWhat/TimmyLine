/**
 * Shared infrastructure for the typed client SDK.
 * Provides a generic fetch wrapper, error handling, and query param serialization.
 */

/** Typed error thrown by all SDK functions on non-2xx responses */
export class ApiError extends Error {
	readonly status: number;
	readonly code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

/** Serializes a params object into a URLSearchParams string, omitting undefined/null values */
export function buildQuery(params?: Record<string, string | number | boolean | undefined | null>): string {
	if (!params) return '';
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null) {
			qs.set(key, String(value));
		}
	}
	const str = qs.toString();
	return str ? `?${str}` : '';
}

/**
 * Generic fetch wrapper used by all SDK resource modules.
 * - Automatically sets Content-Type: application/json for bodies
 * - Checks response.ok and throws ApiError on non-2xx
 * - Returns undefined for 204 No Content
 */
export async function apiFetch<T>(
	method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
	path: string,
	options?: {
		body?: unknown;
		query?: Record<string, string | number | boolean | undefined | null>;
		/** If true, returns raw Response instead of parsed JSON (for binary/blob responses) */
		raw?: boolean;
	}
): Promise<T> {
	const url = path + buildQuery(options?.query);

	const init: RequestInit = { method };

	if (options?.body !== undefined) {
		init.headers = { 'Content-Type': 'application/json' };
		init.body = JSON.stringify(options.body);
	}

	const response = await fetch(url, init);

	if (!response.ok) {
		let errorBody: { error?: string; message?: string; code?: string } = {};
		try {
			errorBody = await response.json();
		} catch {
			// Non-JSON error body — use status text
		}
		const message = errorBody.error ?? errorBody.message ?? response.statusText ?? 'Request failed';
		const code = errorBody.code ?? String(response.status);
		throw new ApiError(response.status, code, message);
	}

	// 204 No Content — nothing to parse
	if (response.status === 204) {
		return undefined as T;
	}

	if (options?.raw) {
		return response as unknown as T;
	}

	return response.json() as Promise<T>;
}
