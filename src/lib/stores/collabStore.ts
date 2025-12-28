// Currently handles one incident at a time ...

import { writable, get, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import { currentSelectedIncident, currentSelectedAnalyst, upsertEntity, removeEntity, updateLookupTable } from './cacheStore';
import type { UserInfo, Incident, IncidentUUID, SocketId } from '$lib/config/socketType.ts';

let socket: Socket | null = null;

// New - Local store for tracking users in rooms (for presence)
export const incidentUsers = writable<Incident>(new Map<SocketId, UserInfo>());
let localUserInfo: UserInfo | null = null;
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
        return (rowUUID: string): UserInfo[] => {
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
    const incident = get(currentSelectedIncident);
    
    if (!analyst || !incident) {
        console.error('Cannot initialize socket: currentSelectedIncident or currentSelectedAnalyst is null');
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

    socket.on('user-joined-incident', (userSocketId: SocketId, userInfo: UserInfo) => {
        incidentUsers.update((incident) => {
            incident.set(userSocketId, userInfo);
            return incident;
        });
    });

    socket.on('enrich-newUser-incidentState', (incidentDetails: Incident) => {
        const tmpIncidentDetails = new Map<SocketId, UserInfo>();

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

    socket.on('user-status-updated', (userSocketId: SocketId, updates: Partial<Pick<UserInfo, 'focusedRow' | 'editingRow'>>) => {
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
        return new Map<SocketId, UserInfo>();
    });
    localUserInfo = null;
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
