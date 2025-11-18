import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import { socketLogger as logger } from '../logging/index';
import type { UserInfo, Incident, IncidentUUID, SocketId } from '$lib/config/socketType.ts';

// Use globalThis to persist across HMR reloads
const globalForSocket = globalThis as unknown as {
    io: Server | undefined;
};

// New - Store for tracking users in rooms (for presence)
const allIncidents = new Map<IncidentUUID, Incident>(); 

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
        registerUserIncidentPresence(socket);
        registerDisconnectEvent(socket);
    });

    return globalForSocket.io;
}

function registerDisconnectEvent(socket: Socket) {
    socket.on('disconnect', () => {
        for (const [incidentUUID, incident] of allIncidents.entries()) {
            // Skip if incident page does not have this socket (user)
            if (!incident.has(socket.id)) continue;

            // Remove user from incident and notify others
            socket.to(`incident:${incidentUUID}`).emit('user-left-incident', socket.id);
            incident.delete(socket.id);
            logger.debug(`Removed socket ${socket.id} from incident ${incidentUUID}`);

            // Skip cleaning allIncidents if Incident is not empty after deletion
            if (incident.size > 0) continue;
            allIncidents.delete(incidentUUID);
        }
    });
}

function registerUserIncidentPresence(socket: Socket) {
    socket.on('inform-focus-change', (data: { incidentUUID: string; rowUUID: string | null; }) => {
        const roomName = `incident:${data.incidentUUID}`;

        // Update internal tracking of user focus
        try {
            let incident = allIncidents.get(data.incidentUUID);
            if (!incident) throw new Error(`Incident ${data.incidentUUID} not found`);

            let userInfo = incident.get(socket.id);
            if (!userInfo) throw new Error(`User ${socket.id} not found in incident ${data.incidentUUID}`);

            userInfo.rowUUID = data.rowUUID;
            userInfo.isFocused = data.rowUUID ? true : false;
            incident.set(socket.id, userInfo);

            allIncidents.set(data.incidentUUID, incident);
        } catch (error) {
            logger.error(`Error occurred while informing focus change: ${error}`);
            return;
        }

        // Notify others in room about focus change after updating internal state
        socket.to(roomName).emit('user-focused-row', socket.id, data.rowUUID);
        logger.debug(`Client ${socket.id} informed focus change in ${roomName} to row ${data.rowUUID}`);
    });
}

function registerLeaveRoomEvent(socket: Socket) {
    socket.on('inform-leave-incident', (data: { incidentUUID: string; }) => {
        const roomName = `incident:${data.incidentUUID}`;

        // Update internal tracking of user focus
        try {
            let incident = allIncidents.get(data.incidentUUID);
            if (!incident) throw new Error(`Incident ${data.incidentUUID} not found`);

            let userInfo = incident.get(socket.id);
            if (!userInfo) throw new Error(`User ${socket.id} not found in incident ${data.incidentUUID}`);

            // Remove user from incident, if last user, remove incident entry
            incident.delete(socket.id);
            if (incident.size === 0) {
                allIncidents.delete(data.incidentUUID);
            } else {
                allIncidents.set(data.incidentUUID, incident);
            }
        } catch (error) {
            logger.error(`Error occurred while removing user from incident: ${error}`);
            return;
        }

        socket.leave(roomName);
        // Notify others that user left
        socket.to(roomName).emit('user-left-incident', socket.id);
        logger.debug(`Client ${socket.id} left ${roomName}`);
    });
}

function registerJoinRoomEvent(socket: Socket) {
    socket.on('inform-join-incident', (data: { incidentUUID: string; analystUUID: string; analystName: string; }) => {
        const roomName = `incident:${data.incidentUUID}`;
        socket.join(roomName);

        // Update internal tracking of user focus
        try {
            let incident = allIncidents.get(data.incidentUUID);

            // Create new incident entry if it doesn't exist - first user joining
            if (!incident) {
                incident = new Map<SocketId, UserInfo>();
                allIncidents.set(data.incidentUUID, incident);
                logger.debug(`Created new incident entry for ${data.incidentUUID}`);
            }

            let userInfo = incident.get(socket.id);

            // Making sure user is not already in incident
            if (userInfo) {
                logger.debug(`User ${socket.id} is already in incident ${data.incidentUUID}`);
                return;
            }

            // Initialize user info
            userInfo = {
                analystUUID: data.analystUUID,
                analystName: data.analystName,
                rowUUID: null,
                isFocused: false,
                isEditing: false
            };

            // Add user to incident and then add to global store
            incident.set(socket.id, userInfo);
            allIncidents.set(data.incidentUUID, incident);
            logger.debug(`Added socket ${socket.id} to incident ${data.incidentUUID}`);
        } catch (error) {
            logger.error(`Error occurred while adding user to incident: ${error}`);
            return;
        }

        let userInfo = allIncidents.get(data.incidentUUID)!.get(socket.id)!;

        // Send new user details to others in the incident room
        socket.to(roomName).emit('user-joined-incident', socket.id, userInfo);

        // Send current incident state to the new user if others are present
        const incident = allIncidents.get(data.incidentUUID)!;
        if (incident.size > 1) {
            socket.emit('enrich-newUser-incidentState', Object.fromEntries(incident));
        }

    });

}

export function getSocketIO(): Server {
    logger.debug('Getting Socket.IO instance');
    if (!globalForSocket.io) {
        logger.fatal('Socket.IO not initialized');
        throw new Error('Socket.IO not initialized');
    }
    return globalForSocket.io;
}