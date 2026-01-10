// Socket.IO client store for real-time collaboration
// Handles both lobby presence (user counts per incident) and incident-specific presence (user activity tracking)

import { writable, get, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import { currentSelectedIncident, currentSelectedAnalyst, upsertEntity, removeEntity, updateLookupTable } from './cacheStore';
import type { UserIncidentState, Incident, IncidentUUID, SocketId } from '$lib/config/socketType.ts';

let socket: Socket | null = null;

// Incident-specific presence tracking
export const incidentUsers = writable<Incident>(new Map<SocketId, UserIncidentState>());

// Lobby presence tracking
export const lobbyUsers = writable<Map<SocketId, { analystUUID: string; analystName: string }>>(new Map());
export const incidentUserCounts = writable<Map<IncidentUUID, number>>(new Map());

let localUserInfo: UserIncidentState | null = null;
let localLastIncidentUUID: IncidentUUID | null = null;

// ============================================================================
// STORES
// ============================================================================

export const currentIncidentUserNames = derived(incidentUsers, ($incidentUsers) => {
    const names: string[] = [];
    $incidentUsers.forEach((userInfo) => {
        if (userInfo && userInfo.analystName) {
            names.push(userInfo.analystName);
        }
    });
    return names;
});

export const currentIncidentUserCount = derived(incidentUsers, ($incidentUsers) => {
    return $incidentUsers.size;
});

// Derived store factory: Get users on a specific row
export const getUsersOnRow = derived(
    incidentUsers,
    ($incidentUsers) => {
        return (rowUUID: string): UserIncidentState[] => {
            return Array.from($incidentUsers.values())
                .filter((user) => user.focusedRow === rowUUID || user.editingRow === rowUUID);
        };
    }
);

// ============================================================================
// CORE SOCKET FUNCTIONS
// ============================================================================

export function initializeSocket() {
    if (!browser || socket) return socket;

    const analyst = get(currentSelectedAnalyst);
    
    if (!analyst) {
        console.error('Cannot initialize socket: currentSelectedAnalyst is null');
        return null;
    }
    
    socket = io({
        path: '/socket.io/',
        transports: ['websocket', 'polling']
    });

    registerEventListeners(socket);

    localUserInfo = {
        analystUUID: analyst.uuid as string,
        analystName: analyst.full_name as string,
        focusedRow: null,
        editingRow: null
    }

    console.log(`Socket initialized for analyst: ${analyst.full_name} (${analyst.uuid})`);
    return true;
}

export function disconnectSocket() {
    if (!browser || !socket) return;
    socket.disconnect();
    socket = null;
    return true;
}

function registerEventListeners(socket: Socket) {
    socket.onAny((event, ...args) => {
        console.debug(`Socket event received: ${event}`, args);
    });

    // Lobby presence events
    socket.on('lobby-users-list', (users: Record<SocketId, { analystUUID: string; analystName: string }>) => {
        const usersMap = new Map<SocketId, { analystUUID: string; analystName: string }>();
        for (const [socketId, userInfo] of Object.entries(users)) {
            usersMap.set(socketId as SocketId, userInfo);
        }
        lobbyUsers.set(usersMap);
        console.log(`Lobby users loaded: ${usersMap.size} users online`);
    });

    socket.on('user-joined-lobby', (userSocketId: SocketId, userInfo: { analystUUID: string; analystName: string }) => {
        lobbyUsers.update((users) => {
            users.set(userSocketId, userInfo);
            return users;
        });
        console.log(`User joined lobby: ${userInfo.analystName}`);
    });

    socket.on('user-left-lobby', (userSocketId: SocketId) => {
        lobbyUsers.update((users) => {
            users.delete(userSocketId);
            return users;
        });
        console.log(`User left lobby: ${userSocketId}`);
    });

    socket.on('incident-user-counts', (counts: Record<IncidentUUID, number>) => {
        const countsMap = new Map<IncidentUUID, number>();
        for (const [incidentUUID, count] of Object.entries(counts)) {
            countsMap.set(incidentUUID as IncidentUUID, count);
        }
        incidentUserCounts.set(countsMap);
        console.debug(`Incident user counts updated:`, counts);
    });

    // Incident-specific presence events
    socket.on('user-joined-incident', (userSocketId: SocketId, userInfo: UserIncidentState) => {
        incidentUsers.update((incident) => {
            incident.set(userSocketId, userInfo);
            return incident;
        });
    });

    socket.on('enrich-newUser-incidentState', (incidentDetails: Incident) => {
        const tmpIncidentDetails = new Map<SocketId, UserIncidentState>();

        for (const [socketId, userInfo] of Object.entries(incidentDetails)) {
            tmpIncidentDetails.set(socketId as SocketId, userInfo);
        }

        incidentUsers.set(tmpIncidentDetails);
    });

    socket.on('user-left-incident', (userSocketId: SocketId) => {
        incidentUsers.update((incident) => {
            incident.delete(userSocketId);
            return incident;
        });
    });

    socket.on('user-status-updated', (userSocketId: SocketId, updates: Partial<Pick<UserIncidentState, 'focusedRow' | 'editingRow'>>) => {
        incidentUsers.update((incident) => {
            const userInfo = incident.get(userSocketId);
            
            if (userInfo) {
                // Apply partial updates
                if ('focusedRow' in updates) {
                    userInfo.focusedRow = updates.focusedRow ?? null;
                }
                if ('editingRow' in updates) {
                    userInfo.editingRow = updates.editingRow ?? null;
                }
                incident.set(userSocketId, userInfo);
            }
            return incident;
        });
    });

    // Data synchronization events
    socket.on('entity-created', (entityType: string, entity: any) => {
        upsertEntity(entityType, entity);
    });

    socket.on('entity-updated', (entityType: string, entity: any) => {
        upsertEntity(entityType, entity);
    });

    socket.on('entity-deleted', (entityType: string, uuid: string) => {
        removeEntity(entityType, uuid);
    });

    socket.on('lookup-updated', (lookupType: string, data: any[]) => {
        updateLookupTable(lookupType, data);
    });
}

// ============================================================================
// HELPER SOCKET FUNCTIONS
// ============================================================================

export function joinLobbySocket() {
    if (!browser || !socket) {
        console.error('Cannot join lobby: socket not initialized');
        return;
    }

    if (!localUserInfo) {
        console.error('Cannot join lobby: localUserInfo is null');
        return;
    }

    socket.emit('inform-join-lobby');
    console.log('Joined lobby room');
}

export function leaveLobbySocket() {
    if (!browser || !socket) return;

    socket.emit('inform-leave-lobby');

    // Clear lobby stores
    lobbyUsers.set(new Map());
    incidentUserCounts.set(new Map());

    console.log('Left lobby room');
}

export function joinIncidentSocket() {
    if (!browser || !socket) return;
    const incident = get(currentSelectedIncident);

    if (!incident || !localUserInfo) {
        console.error('Cannot join incident: currentSelectedIncident is null or localUserInfo is null');
        return;
    }

    socket.emit('inform-join-incident', {
        incidentUUID: incident.uuid as IncidentUUID,
        analystUUID: localUserInfo.analystUUID,
        analystName: localUserInfo.analystName
    })

    console.log(`Joined incident room...${incident!.uuid} - ${incident!.title}`);
    localLastIncidentUUID = incident!.uuid as IncidentUUID;
}

export function leaveIncidentSocket() {
    if (!browser || !socket) return;

    socket.emit('inform-leave-incident', {incidentUUID:localLastIncidentUUID})

    // Clear local incident users store
    incidentUsers.update(() => {
        return new Map<SocketId, UserIncidentState>();
    });
    localLastIncidentUUID = null;
}

export function emitViewRow(rowUUID: string) {
    if (!browser || !socket) return;
    const incident = get(currentSelectedIncident);
    console.debug('Emitting view row:', rowUUID);

    socket.emit('update-user-status', {
        incidentUUID: incident!.uuid as IncidentUUID,
        updates: { focusedRow: rowUUID }
    });

    // Update local user info for tracking purposes
    if (localUserInfo) {
        localUserInfo.focusedRow = rowUUID;
    }
}

export function emitIdle() {
    if (!browser || !socket) return;
    const incident = get(currentSelectedIncident);
    console.debug('Emitting idle state');

    socket.emit('update-user-status', {
        incidentUUID: incident!.uuid as IncidentUUID,
        updates: { focusedRow: null, editingRow: null }
    });

    // Update local user info for tracking purposes
    if (localUserInfo) {
        localUserInfo.focusedRow = null;
        localUserInfo.editingRow = null;
    }
}

export function emitEditingRowStatus(rowUUID: string | null, isEditing: boolean) {
    if (!browser || !socket) return;
    const incident = get(currentSelectedIncident);

    socket.emit('update-user-status', {
        incidentUUID: incident!.uuid as IncidentUUID,
        updates: { editingRow: isEditing ? rowUUID : null }
    });

    // Update local user info for tracking purposes
    if (localUserInfo) {
        localUserInfo.editingRow = isEditing ? rowUUID : null;
    }
}
