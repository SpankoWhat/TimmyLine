import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { socketLogger as logger } from '../logging/index';

// Use globalThis to persist across HMR reloads
const globalForSocket = globalThis as unknown as {
    io: Server | undefined;
};

// Store for tracking users in rooms (for presence)
const roomUsers = new Map<string, Map<string, { socketId: string; analystUuid: string; analystName: string; color: string }>>();

/**
 * Generate a consistent color from socket ID
 */
function generateColorFromId(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    const saturation = 65 + (Math.abs(hash) % 20);
    const lightness = 50 + (Math.abs(hash >> 8) % 15);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Initialize Socket.IO server with all listeners and handlers
 * @param server the server to attach to
 * @returns io instance
 */
export function initializeSocketIO(server: import("http").Server | import("http2").Http2Server | import("http2").Http2SecureServer) {
    if (globalForSocket.io) {
        logger.info('Socket.IO already initialized, returning existing instance');
        return globalForSocket.io;
    }

    // Initialize new Socket.IO server
    logger.info('Creating new Socket.IO server instance');
    globalForSocket.io = new Server(server, {
        cors: {
            origin: process.env.ORIGIN || 'http://localhost:5173',
            methods: ['GET', 'POST']
        }
    });

    globalForSocket.io.on('connection', (socket) => {
        registerJoinRoomEvent(socket);
        registerLeaveRoomEvent(socket);
        registerRowFocus(socket);
        registerDisconnectEvent(socket);
    });

    return globalForSocket.io;
}

function registerDisconnectEvent(socket: Socket) {
    socket.on('disconnect', () => {
        logger.debug(`Client ${socket.id} disconnected`);

        // Clean up user from all rooms
        for (const [incidentUuid, room] of roomUsers.entries()) {
            if (room.has(socket.id)) {
                room.delete(socket.id);

                // Notify others in that room
                socket.to(`incident:${incidentUuid}`).emit('user-left', {
                    socketId: socket.id,
                    incidentUuid
                });

                if (room.size === 0) {
                    roomUsers.delete(incidentUuid);
                }
            }
        }
    });
}

function registerRowFocus(socket: Socket) {
    socket.on('focus-row', (data: { incidentUuid: string; rowUuid: string | null; action: 'viewing' | 'editing' | 'idle'; }) => {
        const roomName = `incident:${data.incidentUuid}`;

        // Broadcast focus change to others in room
        socket.to(roomName).emit('user-focus-changed', {
            socketId: socket.id,
            rowUuid: data.rowUuid,
            action: data.action
        });
    });
}

function registerLeaveRoomEvent(socket: Socket) {
    socket.on('leave-incident', (data: { incidentUuid: string; analystUuid: string; analystName: string; }) => {
        const roomName = `incident:${data.incidentUuid}`;
        socket.leave(roomName);
        logger.debug(`Client ${socket.id} (${data.analystName}) left ${roomName}`);

        // Remove user from room tracking
        const room = roomUsers.get(data.incidentUuid);
        if (room) {
            room.delete(socket.id);
            if (room.size === 0) {
                roomUsers.delete(data.incidentUuid);
            }
        }

        // Notify others that user left
        socket.to(roomName).emit('user-left', {
            socketId: socket.id,
            incidentUuid: data.incidentUuid
        });
    });
}

function registerJoinRoomEvent(socket: Socket) {
    logger.debug(`Client connected with socket id: ${socket.id}`);

    // Join incident room with presence info
    socket.on('join-incident', (data: { incidentUuid: string; analystUuid: string; analystName: string; }) => {
        const roomName = `incident:${data.incidentUuid}`;
        socket.join(roomName);
        logger.debug(`Client ${socket.id} (${data.analystName}) joined ${roomName}`);

        // Track user in room
        if (!roomUsers.has(data.incidentUuid)) {
            roomUsers.set(data.incidentUuid, new Map());
        }
        const room = roomUsers.get(data.incidentUuid)!;
        const userInfo = {
            socketId: socket.id,
            analystUuid: data.analystUuid,
            analystName: data.analystName,
            color: generateColorFromId(socket.id)
        };
        room.set(socket.id, userInfo);

        // Broadcast to others in room that new user joined
        socket.to(roomName).emit('user-joined', {
            ...userInfo,
            currentRow: null,
            action: 'idle'
        });

        // Send current room users to the new joiner
        const roomUsersList = Array.from(room.values()).map(u => ({
            ...u,
            currentRow: null,
            action: 'idle' as const
        }));
        socket.emit('room-users', {
            incidentUuid: data.incidentUuid,
            users: roomUsersList
        });
    });
}

export function getSocketIO(): Server {
    logger.debug('Getting Socket.IO instance');
    if (!globalForSocket.io) {
        logger.error('Socket.IO not initialized');
        throw new Error('Socket.IO not initialized');
    }
    return globalForSocket.io;
}