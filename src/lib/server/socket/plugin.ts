import type { Plugin } from 'vite';
import { initializeSocketIO } from './index';
import { socketLogger as logger } from '../logging/index';

export function socketPlugin(): Plugin {
    return {
        name: 'socket-io',
        configureServer(server) {
            if (server.httpServer) {
                logger.debug('✅ Initializing Socket.IO with HTTP server');
                initializeSocketIO(server.httpServer);
                logger.debug('✅ Socket.IO server initialized');
            } 
        }
    };
}