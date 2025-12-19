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
                .filter((user) => user.rowUUID === rowUUID);
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
        rowUUID: null,
        isFocused: false,
        isEditing: false
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
    socket.on('user-joined-incident', (userSocketId:SocketId, userInfo: UserInfo) => {
        console.debug('user-joined-incident event received:', userSocketId, userInfo);
        
        incidentUsers.update((incident) => {
            incident.set(userSocketId, userInfo);
            return incident;
        });
    });

    socket.on('enrich-newUser-incidentState', (incidentDetails : Incident) => {
        console.debug('enrich-newUser-incidentState event received:', incidentDetails);
        const tmpIncidentDetails = new Map<SocketId, UserInfo>();

        for (const [socketId, userInfo] of Object.entries(incidentDetails)) {
            tmpIncidentDetails.set(socketId as SocketId, userInfo);
        }

        // Is this safe lol?
        incidentUsers.update(() => {
            return tmpIncidentDetails;
        });
        
    });

    socket.on('user-left-incident', (userSocketId:SocketId) => {
        console.debug('user-left-incident event received:', userSocketId);

        incidentUsers.update((incident) => {
            incident.delete(userSocketId);
            return incident;
        });
    });

    socket.on('user-focused-row', (userSocketId:SocketId, rowUUID: string) => {
        console.debug('user-focused-row event received:', userSocketId, rowUUID);

        incidentUsers.update((incident) => {
            const userInfo = incident.get(userSocketId);
            const setFocus = rowUUID ? true : false;
            
            if (userInfo) {
                userInfo.rowUUID = rowUUID;
                userInfo.isFocused = setFocus;
                incident.set(userSocketId, userInfo);
            }
            return incident;
        });
    });

    socket.on('user-editing-row', (userSocketId:SocketId, rowUUID: string) => {
        incidentUsers.update((incident) => {
            const userInfo = incident.get(userSocketId);
            const setFocus = rowUUID ? true : false;
            
            if (userInfo) {
                userInfo.rowUUID = rowUUID;
                userInfo.isFocused = setFocus;
                userInfo.isEditing = true;
                incident.set(userSocketId, userInfo);
            }
            return incident; // Return the SAME map after modifying it
        });
    });

    // Data synchronization events
    socket.on('entity-created', (entityType: string, entity: any) => {
        console.debug('entity-created event received:', entityType, entity);
        upsertEntity(entityType, entity);
    });

    socket.on('entity-updated', (entityType: string, entity: any) => {
        console.debug('entity-updated event received:', entityType, entity);
        upsertEntity(entityType, entity);
    });

    socket.on('entity-deleted', (entityType: string, uuid: string) => {
        console.debug('entity-deleted event received:', entityType, uuid);
        removeEntity(entityType, uuid);
    });

    socket.on('lookup-updated', (lookupType: string, data: any[]) => {
        console.debug('lookup-updated event received:', lookupType, data);
        updateLookupTable(lookupType, data);
    });
}

// ============================================================================
// HELPER SOCKET FUNCTIONS
// ============================================================================

export function joinIncident() {
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

    incidentUsers.update((incident) => {
        incident.set(socket!.id as SocketId, localUserInfo!);
        return incident;
    });

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
    console.debug('State of users before emitting: ', get(incidentUsers));
    console.debug('Emitting view row:', rowUUID);

    socket.emit('inform-focus-change', {
        incidentUUID: incident!.uuid as IncidentUUID,
        rowUUID: rowUUID
    })

    incidentUsers.update((incident) => {
        localUserInfo!.rowUUID = rowUUID;
        localUserInfo!.isFocused = true;
        incident.set(socket!.id as SocketId, localUserInfo!);
        return incident;
    });
}

export function emitIdle() {
    if (!browser || !socket) return;
    const incident = get(currentSelectedIncident);
    console.debug('Emitting idle state');

    socket.emit('inform-focus-change', {
        incidentUUID: incident!.uuid as IncidentUUID,
        rowUUID: null
    });

    incidentUsers.update((incident) => {
        localUserInfo!.rowUUID = null;
        localUserInfo!.isFocused = false;
        incident.set(socket!.id as SocketId, localUserInfo!);
        return incident;
    });
}

// Still has not been implemented on server side
export function emitEditingRow(rowUUID: string) {
    if (!browser || !socket) return;
    const incident = get(currentSelectedIncident);

    socket.emit('inform-edit-row', {
        incidentUUID: incident!.uuid as IncidentUUID,
        rowUUID
    });
    
    incidentUsers.update((incident) => {
        localUserInfo!.rowUUID = rowUUID;
        localUserInfo!.isFocused = true;
        localUserInfo!.isEditing = true;
        incident.set(socket!.id as SocketId, localUserInfo!);
        return incident;
    });

    console.warn('emitEditingRow not yet implemented on server side');
}
