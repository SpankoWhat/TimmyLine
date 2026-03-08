/**
 * Client SDK — Health check
 * Usage: import { health } from '$lib/client'
 */
import { apiFetch } from './base';

export interface HealthResponse {
	status: 'healthy' | 'degraded' | 'unhealthy';
	database: string;
	mcp: string;
	mcpActiveSessions: number;
	timestamp: number;
}

export const health = {
	/** Check server health status */
	check(): Promise<HealthResponse> {
		return apiFetch<HealthResponse>('GET', '/api/health');
	}
};
