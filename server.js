/**
 * TimmyLine — Production Server Entry Point
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * In development, Vite runs its own HTTP server and the Socket.IO Vite
 * plugin (src/lib/server/socket/plugin.ts) attaches to it automatically.
 * In production there is no Vite — adapter-node just builds a handler
 * function and some static assets.
 *
 * This file creates a plain Node.js HTTP server, wires up the SvelteKit
 * request handler (build/handler.js), and enables Socket.IO to attach to
 * the *same* server so WebSocket upgrades and normal HTTP share one port.
 *
 * HOW SOCKET.IO WORKS IN PRODUCTION
 * ----------------------------------
 * adapter-node bundles all server-side code into hashed chunks, so we
 * can't import initializeSocketIO by path.  Instead we use a "globalThis
 * bridge":
 *
 *   1. This file stores the HTTP server on globalThis.__timmyline_server
 *   2. SvelteKit's hooks.server.ts (which runs inside the build and has
 *      access to $lib/server) picks it up and calls initializeSocketIO()
 *   3. The first incoming request triggers the hook, which wires up
 *      Socket.IO once
 *
 * This avoids duplicating any socket/auth/DB logic outside the build.
 *
 * USAGE
 * -----
 *   NODE_ENV=production node server.js
 */

import 'dotenv/config';
import { createServer } from 'node:http';

const PORT = parseInt(process.env.PORT || '3000', 10);
const ORIGIN = process.env.ORIGIN || `http://localhost:${PORT}`;

// Ensure ORIGIN is set for SvelteKit and Socket.IO
process.env.ORIGIN = ORIGIN;

// Create the HTTP server BEFORE importing the handler so that
// globalThis.__timmyline_server is available when hooks.server.ts runs.
const server = createServer();

// Store on globalThis so the SvelteKit hooks can find it
globalThis.__timmyline_server = server;

// Import the SvelteKit handler (built by adapter-node) and attach it
const { handler } = await import('./build/handler.js');
server.on('request', handler);

// ── Start listening ──────────────────────────────────────────────────
server.listen(PORT, () => {
	console.log(`🟢 TimmyLine running on ${ORIGIN} (port ${PORT})`);
});
