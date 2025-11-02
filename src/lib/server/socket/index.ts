import { Server } from 'socket.io';

// Use globalThis to persist across HMR reloads
const globalForSocket = globalThis as unknown as {
    io: Server | undefined;
};

export function initializeSocketIO(server: import("http").Server | import("http2").Http2Server | import("http2").Http2SecureServer) {
    if (globalForSocket.io) {
        console.log('⚠️ Socket.IO already initialized, returning existing instance');
        return globalForSocket.io;
    }
    
    console.log('🚀 Creating new Socket.IO server instance');
    globalForSocket.io = new Server(server, {
        cors: {
            origin: process.env.ORIGIN || 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    });
    
    globalForSocket.io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);
        
        // Join incident room
        socket.on('join-incident', (incidentUuid: string) => {
            socket.join(`incident:${incidentUuid}`);
            console.log(`Client ${socket.id} joined incident:${incidentUuid}`);
        });
        
        // Leave incident room
        socket.on('leave-incident', (incidentUuid: string) => {
            socket.leave(`incident:${incidentUuid}`);
            console.log(`Client ${socket.id} left incident:${incidentUuid}`);
        });
        
        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });
    
    return globalForSocket.io;
}

export function getSocketIO(): Server {
    console.log('Getting Socket.IO instance', globalForSocket.io ? 'exists' : 'null');
    if (!globalForSocket.io) throw new Error('Socket.IO not initialized');
    return globalForSocket.io;
}