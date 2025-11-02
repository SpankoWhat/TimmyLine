import type { Plugin } from 'vite';
import { initializeSocketIO } from './index';

export function socketPlugin(): Plugin {
    return {
        name: 'socket-io',
        configureServer(server) {
            console.log('🔧 configureServer hook called');
            console.log('🔧 server.httpServer exists?', !!server.httpServer);
            
            if (server.httpServer) {
                console.log('✅ Initializing Socket.IO with HTTP server');
                initializeSocketIO(server.httpServer);
                console.log('✅ Socket.IO server initialized');
            } else {
                console.warn('⚠️ server.httpServer not available yet');
                // Try on the next tick when the server is ready
                server.middlewares.use((_req, _res, next) => {
                    if (server.httpServer && !initializeSocketIO(server.httpServer)) {
                        console.log('✅ Socket.IO initialized via middleware fallback');
                    }
                    next();
                });
            }
        }
    };
}