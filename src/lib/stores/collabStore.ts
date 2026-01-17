// Socket.IO client store for real-time collaboration
// Handles both lobby presence (user counts per incident) and incident-specific presence (user activity tracking)

import { writable, get, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import { currentSelectedIncident, currentSelectedAnalyst, upsertEntity, removeEntity, updateLookupTable } from './cacheStore';
import type { UserIncidentState, UsersInIncident, IncidentUUID, SocketId, AnalystUUID } from '$lib/config/socketType.ts';

let socket: Socket | null = null;
let socketReadyPromise: Promise<boolean> | null = null;
let socketReadyResolve: ((value: boolean) => void) | null = null;

// Incident-specific presence tracking (now keyed by AnalystUUID)
export const usersInCurrentIncident = writable<UsersInIncident>(new Map<AnalystUUID, UserIncidentState>());

// Lobby presence tracking (now keyed by AnalystUUID)
export const usersInLobby = writable<Map<AnalystUUID, { analystUUID: string; analystName: string }>>(new Map());
export const usersInEachIncident = writable<Map<IncidentUUID, number>>(new Map());

let localUserInfo: UserIncidentState | null = null;
let localLastIncidentUUID: IncidentUUID | null = null;

// ============================================================================
// STORES
// ============================================================================

export const userNamesInCurrentIncident = derived(usersInCurrentIncident, ($incidentUsers) => {
    const names: string[] = [];
    $incidentUsers.forEach((userInfo) => {
        if (userInfo && userInfo.analystName) {
            names.push(userInfo.analystName);
        }
    });
    return names;
});

export const currentIncidentUserCount = derived(usersInCurrentIncident, ($incidentUsers) => {
    return $incidentUsers.size;
});

// Derived store factory: Get users on a specific row
export const getUsersOnRow = derived(
    usersInCurrentIncident,
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

/**
 * Returns a promise that resolves when the socket is ready.
 * If socket is already initialized, resolves immediately.
 * If analyst isn't loaded yet, waits for it then initializes.
 */
export function ensureSocketReady(): Promise<boolean> {
    if (!browser) return Promise.resolve(false);

    // Socket already initialized and connected
    if (socket?.connected) return Promise.resolve(true);

    // Already waiting for socket to be ready
    if (socketReadyPromise) return socketReadyPromise;

    // Create a new promise that will resolve when socket is ready
    socketReadyPromise = new Promise((resolve) => {
        socketReadyResolve = resolve;

        const analyst = get(currentSelectedAnalyst);

        if (analyst) {
            // Analyst is ready, initialize immediately
            const success = initializeSocketInternal(analyst);
            resolve(success);
            socketReadyPromise = null;
            socketReadyResolve = null;
        } else {
            // Wait for analyst to be set
            console.log('Socket: Waiting for analyst data...');
            const unsubscribe = currentSelectedAnalyst.subscribe((a) => {
                if (a && !socket) {
                    const success = initializeSocketInternal(a);
                    resolve(success);
                    socketReadyPromise = null;
                    socketReadyResolve = null;
                    unsubscribe();
                }
            });
        }
    });

    return socketReadyPromise;
}

/**
 * Initialize socket - can be called early, will wait for analyst if needed
 */
export function initializeSocket(): Promise<boolean> {
    return ensureSocketReady();
}

/**
 * Internal function that actually creates the socket connection
 */
function initializeSocketInternal(analyst: { uuid: string; full_name: string | null; username?: string }): boolean {
    if (!browser || socket) return !!socket;
    
    socket = io({
        path: '/socket.io/',
        transports: ['websocket', 'polling']
    });

    registerEventListeners(socket);

    localUserInfo = {
        analystUUID: analyst.uuid as string,
        analystName: (analyst.full_name || analyst.username || 'Unknown') as string,
        focusedRow: null,
        editingRow: null,
        socketIds: new Set() // Empty on client side, managed by server
    };

    console.log(`Socket initialized for analyst: ${localUserInfo.analystName} (${analyst.uuid})`);
    return true;
}

export function disconnectSocket() {
    if (!browser || !socket) return;
    socket.disconnect();
    socket = null;
    socketReadyPromise = null;
    socketReadyResolve = null;
    localUserInfo = null;
    return true;
}

function registerEventListeners(socket: Socket) {
    socket.onAny((event, ...args) => {
        console.debug(`Socket event received: ${event}`, args);
    });

    // Lobby presence events
    socket.on('lobby-users-list', (users: Record<AnalystUUID, { analystUUID: string; analystName: string }>) => {
        const usersMap = new Map<AnalystUUID, { analystUUID: string; analystName: string }>();
        for (const [analystUUID, userInfo] of Object.entries(users)) {
            usersMap.set(analystUUID as AnalystUUID, userInfo);
        }
        usersInLobby.set(usersMap);
    });

    socket.on('user-joined-lobby', (analystUUID: AnalystUUID, userInfo: { analystUUID: string; analystName: string }) => {
        usersInLobby.update((users) => {
            users.set(analystUUID, userInfo);
            return users;
        });
    });

    socket.on('user-left-lobby', (analystUUID: AnalystUUID) => {
        usersInLobby.update((users) => {
            users.delete(analystUUID);
            return users;
        });
    });

    socket.on('incident-user-counts', (counts: Record<IncidentUUID, number>) => {
        const countsMap = new Map<IncidentUUID, number>();
        for (const [incidentUUID, count] of Object.entries(counts)) {
            countsMap.set(incidentUUID as IncidentUUID, count);
        }
        usersInEachIncident.set(countsMap);
    });

    // Incident-specific presence events
    socket.on('user-joined-incident', (analystUUID: AnalystUUID, userInfo: UserIncidentState) => {
        usersInCurrentIncident.update((incident) => {
            incident.set(analystUUID, userInfo);
            return incident;
        });
    });

    // I do not like how this is handled. 
    socket.on('enrich-newUser-incidentState', (incidentDetails: Record<string, UserIncidentState> | UsersInIncident) => {
        const tmpIncidentDetails = new Map<AnalystUUID, UserIncidentState>();

        // Handle both Map and Object forms
        if (incidentDetails instanceof Map) {
            for (const [analystUUID, userInfo] of incidentDetails) {
                tmpIncidentDetails.set(analystUUID, userInfo);
            }
        } else {
            for (const [analystUUID, userInfo] of Object.entries(incidentDetails)) {
                tmpIncidentDetails.set(analystUUID as AnalystUUID, userInfo);
            }
        }

        usersInCurrentIncident.set(tmpIncidentDetails);
    });

    socket.on('user-left-incident', (analystUUID: AnalystUUID) => {
        usersInCurrentIncident.update((incident) => {
            incident.delete(analystUUID);
            return incident;
        });
    });

    socket.on('user-status-updated', (analystUUID: AnalystUUID, updates: Partial<Pick<UserIncidentState, 'focusedRow' | 'editingRow'>>) => {
        usersInCurrentIncident.update((incident) => {
            const userInfo = incident.get(analystUUID);
            
            if (userInfo) {
                // Apply partial updates (consolidated across all tabs for this analyst)
                if ('focusedRow' in updates) {
                    userInfo.focusedRow = updates.focusedRow ?? null;
                }
                if ('editingRow' in updates) {
                    userInfo.editingRow = updates.editingRow ?? null;
                }
                incident.set(analystUUID, userInfo);
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

export async function joinLobbySocket() {
    if (!browser) return;

    // Wait for socket to be ready (handles analyst not loaded yet)
    const ready = await ensureSocketReady();
    if (!ready || !socket) {
        console.error('Cannot join lobby: socket failed to initialize');
        return;
    }

    if (!localUserInfo) {
        console.error('Cannot join lobby: localUserInfo is null');
        return;
    }

    socket.emit('inform-join-lobby');
}

export function leaveLobbySocket() {
    if (!browser || !socket) return;

    socket.emit('inform-leave-lobby');

    // Clear lobby stores
    usersInLobby.set(new Map());
    usersInEachIncident.set(new Map());
}

export async function joinIncidentSocket() {
    if (!browser) return;

    // Wait for socket to be ready (handles analyst not loaded yet)
    const ready = await ensureSocketReady();
    if (!ready || !socket) {
        console.error('Cannot join incident: socket failed to initialize');
        return;
    }

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

    console.log(`Joined incident room: ${incident!.title} - ${incident!.uuid}`);
    localLastIncidentUUID = incident!.uuid as IncidentUUID;
}

export function leaveIncidentSocket() {
    if (!browser || !socket) return;

    socket.emit('inform-leave-incident', {incidentUUID:localLastIncidentUUID})

    // Clear local incident users store
    usersInCurrentIncident.update(() => {
        return new Map<AnalystUUID, UserIncidentState>();
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
