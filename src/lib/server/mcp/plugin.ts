/**
 * MCP Server Vite Plugin
 *
 * Spawns the TimmyLine MCP stdio server as a child process when the
 * Vite dev server starts. The MCP server runs alongside the SvelteKit
 * app and communicates with AI clients via stdin/stdout.
 *
 * The child process is automatically killed when the dev server shuts down.
 */

import type { Plugin } from 'vite';
import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';
import { setMcpRunning, setMcpStopped } from './state';
import { mcpLogger as logger } from '../logging';

let mcpProcess: ChildProcess | null = null;

export function mcpPlugin(): Plugin {
	return {
		name: 'mcp-server',
		configureServer(server) {
			// Small delay to let the HTTP server bind first
			setTimeout(() => {
				const serverPath = resolve('src/lib/server/mcp/server.ts');

				logger.info('Starting MCP stdio server', { serverPath });

				mcpProcess = spawn('npx', ['tsx', serverPath], {
					stdio: ['pipe', 'pipe', 'inherit'], // stdin/stdout piped for MCP, stderr to console
					shell: true,
					env: { ...process.env }
				});

				mcpProcess.on('error', (err) => {
					logger.error('Failed to start MCP server', { error: err instanceof Error ? err.message : 'Unknown error' });
					setMcpStopped(err.message);
				});

				mcpProcess.on('exit', (code, signal) => {
					if (signal !== 'SIGTERM') {
						logger.warn('MCP server process exited', { code, signal });
					}
					setMcpStopped();
					mcpProcess = null;
				});

				logger.info('MCP server process started', { pid: mcpProcess.pid });
				if (mcpProcess.pid) {
					setMcpRunning(mcpProcess.pid);
				}
			}, 2000);

			// Clean up on server close
			server.httpServer?.on('close', () => {
				if (mcpProcess) {
					logger.info('Shutting down MCP server');
					mcpProcess.kill('SIGTERM');
					setMcpStopped();
					mcpProcess = null;
				}
			});
		}
	};
}
