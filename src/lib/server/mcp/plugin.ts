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

let mcpProcess: ChildProcess | null = null;

export function mcpPlugin(): Plugin {
	return {
		name: 'mcp-server',
		configureServer(server) {
			// Small delay to let the HTTP server bind first
			setTimeout(() => {
				const serverPath = resolve('src/lib/server/mcp/server.ts');

				console.log('[MCP] 🔌 Starting MCP stdio server...');

				mcpProcess = spawn('npx', ['tsx', serverPath], {
					stdio: ['pipe', 'pipe', 'inherit'], // stdin/stdout piped for MCP, stderr to console
					shell: true,
					env: { ...process.env }
				});

				mcpProcess.on('error', (err) => {
					console.error('[MCP] ❌ Failed to start MCP server:', err.message);
				});

				mcpProcess.on('exit', (code, signal) => {
					if (signal !== 'SIGTERM') {
						console.log(`[MCP] Process exited (code=${code}, signal=${signal})`);
					}
					mcpProcess = null;
				});

				console.log(`[MCP] ✅ MCP server spawned (PID: ${mcpProcess.pid})`);
			}, 2000);

			// Clean up on server close
			server.httpServer?.on('close', () => {
				if (mcpProcess) {
					console.log('[MCP] 🛑 Shutting down MCP server...');
					mcpProcess.kill('SIGTERM');
					mcpProcess = null;
				}
			});
		}
	};
}
