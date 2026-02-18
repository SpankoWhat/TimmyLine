/**
 * MCP Server State Tracker
 * 
 * Tracks the runtime state of the MCP server process.
 * Used by the Vite plugin to update status and by health checks to report status.
 * 
 * Uses a file-based state store to share state between Vite dev server and SvelteKit processes.
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export type McpStatus = {
	running: boolean;
	pid: number | null;
	startedAt: number | null;
	lastError: string | null;
};

const STATE_FILE = join(tmpdir(), 'timmyline-mcp-state.json');

function readState(): McpStatus {
	try {
		if (existsSync(STATE_FILE)) {
			const content = readFileSync(STATE_FILE, 'utf-8');
			const state = JSON.parse(content) as McpStatus;
			
			// Validate that process is still running if state says it is
			if (state.running && state.pid) {
				try {
					// Check if process exists (process.kill with signal 0 doesn't kill, just checks)
					process.kill(state.pid, 0);
				} catch {
					// Process no longer exists, mark as stopped
					return {
						running: false,
						pid: null,
						startedAt: null,
						lastError: 'Process terminated unexpectedly'
					};
				}
			}
			
			return state;
		}
	} catch (err) {
		// If file is corrupted or unreadable, return default state
	}
	
	return {
		running: false,
		pid: null,
		startedAt: null,
		lastError: null
	};
}

function writeState(state: McpStatus): void {
	try {
		writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
	} catch (err) {
		console.error('[MCP State] Failed to write state file:', err);
	}
}

export function getMcpStatus(): McpStatus {
	return readState();
}

export function setMcpRunning(pid: number): void {
	writeState({
		running: true,
		pid,
		startedAt: Date.now(),
		lastError: null
	});
}

export function setMcpStopped(error?: string): void {
	writeState({
		running: false,
		pid: null,
		startedAt: null,
		lastError: error || null
	});
}
