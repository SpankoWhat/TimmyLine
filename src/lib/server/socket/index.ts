import { Server, type Socket } from 'socket.io';
import { socketLogger as logger } from '../logging/index';
import type { UserIncidentState, Incident, IncidentUUID, SocketId, AnalystUUID } from '../../config/socketType.ts';
import { db } from '..';
import { authSessions, authUsers, analysts } from '../database';
import { eq } from 'drizzle-orm';

import 'dotenv/config';
const ORIGIN = process.env.ORIGIN;

// Use globalThis to persist across HMR reloads
const globalForSocket = globalThis as unknown as {
    io: Server | undefined;
};

// Store for tracking users in incident rooms (single source of truth for presence)
const allActiveIncidentUsers = new Map<IncidentUUID, Incident>(); 

// Reverse lookup: socket.id -> analyst UUID for quick lookups in event handlers
const socketToAnalystMap = new Map<SocketId, AnalystUUID>(); 

/**
 * Validate session token from Socket.IO handshake
 * Returns analyst info if valid, null otherwise
 */
async function validateSocketSession(
    socket: Socket
): Promise<{ analystUUID: string; analystName: string } | null> {
    try {
        // Extract session token from cookies in handshake
        const cookies = socket.handshake.headers.cookie;
        if (!cookies) {
            logger.warn(`Socket ${socket.id} - No cookies in handshake`);
            return null;
        }

        // Parse session token from cookies (Auth.js default cookie name)
        const sessionTokenMatch = cookies.match(/authjs\.session-token=([^;]+)/);
        if (!sessionTokenMatch) {
            logger.warn(`Socket ${socket.id} - No session token found in cookies`);
            return null;
        }

        const sessionToken = sessionTokenMatch[1];

        // Validate session in database
        const sessionResult = await db
            .select()
            .from(authSessions)
            .where(eq(authSessions.sessionToken, sessionToken))
            .limit(1);

        if (sessionResult.length === 0) {
            logger.warn(`Socket ${socket.id} - Invalid session token`);
            return null;
        }

        const session = sessionResult[0];

        // Check if session is expired
        if (session.expires.getTime() < Date.now()) {
            logger.warn(`Socket ${socket.id} - Session expired`);
            return null;
        }

        // Fetch user and analyst info
        const userResult = await db
            .select()
            .from(authUsers)
            .where(eq(authUsers.id, session.userId))
            .limit(1);

        if (userResult.length === 0) {
            logger.warn(`Socket ${socket.id} - User not found for session`);
            return null;
        }

        const user = userResult[0];

        // Fetch analyst record
        const analystResult = await db
            .select()
            .from(analysts)
            .where(eq(analysts.user_id, user.id))
            .limit(1);

        if (analystResult.length === 0) {
            logger.warn(`Socket ${socket.id} - No analyst linked to user ${user.id}`);
            return null;
        }

        const analyst = analystResult[0];

        logger.info(
            `Socket ${socket.id} - Authenticated as ${analyst.username} (${analyst.uuid})`
        );

        return {
            analystUUID: analyst.uuid,
            analystName: analyst.full_name || analyst.username
        };
    } catch (error) {
        logger.error(`Socket ${socket.id} - Session validation error: ${error}`);
        return null;
    }
}

/**
 * Initialize Socket.IO server with all listeners and handlers
 * @param server the server to attach to
 * @returns io instance
 */
export function initializeSocketIO(
    server:
        | import('http').Server
        | import('http2').Http2Server
        | import('http2').Http2SecureServer
) {
    if (globalForSocket.io) {
        logger.info('Socket.IO already initialized, returning existing instance');
        return globalForSocket.io;
    }

    // Initialize new Socket.IO server
    logger.info('Creating new Socket.IO server instance');

    if (!ORIGIN) {
        logger.fatal('ORIGIN is not defined in environment variables.');
        return null;
    }

    globalForSocket.io = new Server(server, {
        cors: {
            origin: ORIGIN,
            methods: ['GET', 'POST']
        }
    });

    // Authentication middleware - validate session before allowing connection
    globalForSocket.io.use(async (socket, next) => {
        const authInfo = await validateSocketSession(socket);

        if (!authInfo) {
            logger.warn(`Socket ${socket.id} - Authentication failed, rejecting connection`);
            return next(new Error('Authentication failed'));
        }

        // Attach validated analyst info to socket for use in event handlers
        socket.data.analystUUID = authInfo.analystUUID;
        socket.data.analystName = authInfo.analystName;

        next();
    });

    globalForSocket.io.on('connection', (socket) => {
        logger.info(
            `Socket ${socket.id} - Connected as ${socket.data.analystName} (${socket.data.analystUUID})`
        );

        registerLobbyEvents(socket);
        registerJoinRoomEvent(socket);
        registerLeaveRoomEvent(socket);
        registerUserIncidentPresence(socket);
        registerDisconnectEvent(socket);
    });

    return globalForSocket.io;
}

/**
 * Derive incident user counts from active incidents
 * @returns Record mapping incident UUIDs to user counts
 */
function getIncidentCounts(): Record<IncidentUUID, number> {
    const incidentCounts: Record<IncidentUUID, number> = {};
    for (const [incidentUUID, incident] of allActiveIncidentUsers) {
        incidentCounts[incidentUUID] = incident.size;
    }
    return incidentCounts;
}

function registerLobbyEvents(socket: Socket) {
    socket.on('inform-join-lobby', () => {
        socket.join('lobby');

        // Derive all online users from existing incident tracking
        const onlineUsers = new Map<AnalystUUID, { analystUUID: string; analystName: string }>();

        for (const [_, incident] of allActiveIncidentUsers) {
            for (const [analystUUID, userState] of incident) {
                onlineUsers.set(analystUUID, {
                    analystUUID: userState.analystUUID,
                    analystName: userState.analystName
                });
            }
        }

        // Send current lobby state to new joiner
        socket.emit('lobby-users-list', Object.fromEntries(onlineUsers));
        socket.emit('incident-user-counts', getIncidentCounts());

        // Notify all lobby users about the new joiner
        globalForSocket.io!.to('lobby').emit('user-joined-lobby', socket.data.analystUUID, {
            analystUUID: socket.data.analystUUID,
            analystName: socket.data.analystName
        });

        logger.debug(`Client ${socket.id} joined lobby`);
    });

    socket.on('inform-leave-lobby', () => {
        socket.leave('lobby');

        // Notify all lobby users about the departure
        globalForSocket.io!.to('lobby').emit('user-left-lobby', socket.data.analystUUID);

        logger.debug(`Client ${socket.id} left lobby`);
    });
}

function registerJoinRoomEvent(socket: Socket) {
    socket.on(
        'inform-join-incident',
        (data: { incidentUUID: string; analystUUID: string; analystName: string }) => {
            const roomName = `incident:${data.incidentUUID}`;

            // Use server-validated analyst info instead of client-provided data
            const validatedAnalystUUID = socket.data.analystUUID;
            const validatedAnalystName = socket.data.analystName;

            // Leave lobby room when entering an incident
            if (socket.rooms.has('lobby')) {
                socket.leave('lobby');
                logger.debug(`Client ${socket.id} left lobby to join incident`);
            }

            socket.join(roomName);

            // Add this socket to the reverse lookup map
            socketToAnalystMap.set(socket.id, validatedAnalystUUID);

            // Update internal tracking of user focus
            try {
                let incident = allActiveIncidentUsers.get(data.incidentUUID);

                // Create new incident entry if it doesn't exist - first user joining
                if (!incident) {
                    incident = new Map<AnalystUUID, UserIncidentState>();
                    allActiveIncidentUsers.set(data.incidentUUID, incident);
                    logger.debug(`Created new incident entry for ${data.incidentUUID}`);
                }

                let userInfo = incident.get(validatedAnalystUUID);

                // If analyst already exists, add this socket to their socketIds set
                if (userInfo) {
                    userInfo.socketIds.add(socket.id);
                    logger.debug(`Added socket ${socket.id} to existing analyst ${validatedAnalystUUID} in incident ${data.incidentUUID}`);
                } else {
                    // Initialize user info with server-validated identity
                    userInfo = {
                        analystUUID: validatedAnalystUUID,
                        analystName: validatedAnalystName,
                        focusedRow: null,
                        editingRow: null,
                        socketIds: new Set([socket.id])
                    };

                    // Add analyst to incident
                    incident.set(validatedAnalystUUID, userInfo);
                    allActiveIncidentUsers.set(data.incidentUUID, incident);
                    logger.debug(`Added new analyst ${validatedAnalystUUID} to incident ${data.incidentUUID}`);

                    // Only emit user-joined-incident for NEW analysts, not new sockets
                    globalForSocket.io!.to(roomName).emit('user-joined-incident', validatedAnalystUUID, userInfo);
                }
            } catch (error) {
                logger.error(`Error occurred while adding user to incident: ${error}`);
                return;
            }

            // Send current incident state to the new user if others are present
            const incident = allActiveIncidentUsers.get(data.incidentUUID)!;
            if (incident.size > 1) {
                socket.emit('enrich-newUser-incidentState', Object.fromEntries(incident));
            }

            // Broadcast updated incident counts to lobby
            globalForSocket.io!.to('lobby').emit('incident-user-counts', getIncidentCounts());
        }
    );
}

function registerDisconnectEvent(socket: Socket) {
    socket.on('disconnect', () => {
        let wasInAnyIncident = false;
        const analystUUID = socketToAnalystMap.get(socket.id);

        if (!analystUUID) {
            logger.debug(`Socket ${socket.id} disconnected but was not tracked`);
            return;
        }

        for (const [incidentUUID, incident] of allActiveIncidentUsers.entries()) {
            // Skip if incident doesn't have this analyst
            const userInfo = incident.get(analystUUID);
            if (!userInfo) continue;

            wasInAnyIncident = true;

            // Remove this socket from the analyst's socket set
            userInfo.socketIds.delete(socket.id);
            logger.debug(`Removed socket ${socket.id} from analyst ${analystUUID} in incident ${incidentUUID}`);

            // If analyst has no more sockets, remove them from the incident
            if (userInfo.socketIds.size === 0) {
                incident.delete(analystUUID);

                // Notify ALL clients that this analyst left
                globalForSocket.io!.to(`incident:${incidentUUID}`).emit('user-left-incident', analystUUID);
                logger.debug(`Removed analyst ${analystUUID} from incident ${incidentUUID} (no more sockets)`);

                // Remove the incident if empty
                if (incident.size === 0) {
                    allActiveIncidentUsers.delete(incidentUUID);
                }
            }
        }

        // Remove from reverse lookup
        socketToAnalystMap.delete(socket.id);

        // Notify lobby users if this user was in any incidents
        if (wasInAnyIncident) {
            // Check if analyst still has other sockets connected anywhere
            const analystStillConnected = Array.from(allActiveIncidentUsers.values()).some(incident =>
                incident.has(analystUUID)
            );

            if (!analystStillConnected) {
                globalForSocket.io!.to('lobby').emit('user-left-lobby', analystUUID);
            }

            // Broadcast updated incident counts to lobby
            globalForSocket.io!.to('lobby').emit('incident-user-counts', getIncidentCounts());
        }

        logger.debug(`Socket ${socket.id} disconnected`);
    });
}

function registerUserIncidentPresence(socket: Socket) {
    socket.on(
        'update-user-status',
        (data: { incidentUUID: string; updates: Partial<Pick<UserIncidentState, 'focusedRow' | 'editingRow'>>; }) => {
        const roomName = `incident:${data.incidentUUID}`;
            const analystUUID = socketToAnalystMap.get(socket.id);

            if (!analystUUID) {
                logger.error(`Socket ${socket.id} not found in analyst mapping for status update`);
                return;
            }

        // Update internal tracking of user status
        try {
            let incident = allActiveIncidentUsers.get(data.incidentUUID);
            if (!incident) throw new Error(`Incident ${data.incidentUUID} not found`);

            let userInfo = incident.get(analystUUID);
            if (!userInfo) throw new Error(`Analyst ${analystUUID} not found in incident ${data.incidentUUID}`);

            // Apply partial updates (consolidated for all tabs of this analyst)
            if ('focusedRow' in data.updates) {
                userInfo.focusedRow = data.updates.focusedRow ?? null;
            }
            if ('editingRow' in data.updates) {
                userInfo.editingRow = data.updates.editingRow ?? null;
            }

            incident.set(analystUUID, userInfo);
            allActiveIncidentUsers.set(data.incidentUUID, incident);
        } catch (error) {
            logger.error(`Error occurred while updating user status: ${error}`);
            return;
        }

            // Notify ALL clients in room about status change (using analyst UUID)
            globalForSocket.io!.to(roomName).emit('user-status-updated', analystUUID, data.updates);
            logger.debug(`Analyst ${analystUUID} updated status in ${roomName}:`, data.updates);
    });
}

function registerLeaveRoomEvent(socket: Socket) {
    socket.on('inform-leave-incident', (data: { incidentUUID: string; }) => {
        const roomName = `incident:${data.incidentUUID}`;
        const analystUUID = socketToAnalystMap.get(socket.id);

        if (!analystUUID) {
            logger.error(`Socket ${socket.id} not found in analyst mapping for leave incident`);
            return;
        }

        // Update internal tracking of user focus
        try {
            let incident = allActiveIncidentUsers.get(data.incidentUUID);
            if (!incident) throw new Error(`Incident ${data.incidentUUID} not found`);

            let userInfo = incident.get(analystUUID);
            if (!userInfo) throw new Error(`Analyst ${analystUUID} not found in incident ${data.incidentUUID}`);

            // Remove this socket from the analyst's socket set
            userInfo.socketIds.delete(socket.id);

            // If analyst has no more sockets, remove them from the incident
            if (userInfo.socketIds.size === 0) {
                incident.delete(analystUUID);

                // Notify ALL clients that this analyst left
                globalForSocket.io!.to(roomName).emit('user-left-incident', analystUUID);

                // Remove the incident if empty
                if (incident.size === 0) {
                    allActiveIncidentUsers.delete(data.incidentUUID);
                } else {
                    allActiveIncidentUsers.set(data.incidentUUID, incident);
                }
            }
        } catch (error) {
            logger.error(`Error occurred while removing user from incident: ${error}`);
            return;
        }

        socket.leave(roomName);

        // Remove from reverse lookup
        socketToAnalystMap.delete(socket.id);

        // Broadcast updated incident counts to lobby
        globalForSocket.io!.to('lobby').emit('incident-user-counts', getIncidentCounts());

        logger.debug(`Socket ${socket.id} for analyst ${analystUUID} left ${roomName}`);
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