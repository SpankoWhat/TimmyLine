// Socket.IO client store for real-time collaboration
// Handles both lobby presence (user counts per incident) and incident-specific presence (user activity tracking)

import { writable, get, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';
import { currentSelectedIncident, currentSelectedAnalyst, upsertEntity, removeEntity, updateLookupTable } from './cacheStore';
import {
    applyTimelineEntityRemoval,
    applyTimelineEntityUpsert,
    applyTimelineJunctionDelete,
    applyTimelineJunctionUpdate,
    isTimelineSocketEntityType
} from './timeline';
import type { UserIncidentState, UsersInIncident, IncidentUUID, SocketId, AnalystUUID, CursorPosition } from '$lib/config/socketType.ts';

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

// Remote cursor positions (keyed by analyst UUID)
export const remoteCursors = writable<Map<AnalystUUID, CursorPosition & { analystName: string }>>(new Map());

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
        cursor: null,
        socketIds: [] // Empty on client side, managed by server
    };

    console.log(`Socket initialized for analyst: ${localUserInfo?.analystName} (${analyst.uuid})`);
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
        // console.debug(`%c[SOCKET-RX] ${event}`, 'color: #00ff88; font-weight: bold', ...args);
    });

    // Server-pushed collaboration config
    socket.on('config', (cfg: { cursorThrottleMs?: number }) => {
        if (cfg.cursorThrottleMs != null && cfg.cursorThrottleMs > 0) {
            cursorThrottleMs = cfg.cursorThrottleMs;
        }
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
        // Remove their cursor
        remoteCursors.update((cursors) => {
            cursors.delete(analystUUID);
            return cursors;
        });
    });

    // Remote cursor movement events
    socket.on('cursor-moved', (analystUUID: AnalystUUID, cursor: CursorPosition) => {
        // Look up the analyst name from the incident users store
        const incidentUsers = get(usersInCurrentIncident);
        const userInfo = incidentUsers.get(analystUUID);
        const analystName = userInfo?.analystName ?? 'Unknown';

        remoteCursors.update((cursors) => {
            if (cursor.visible) {
                cursors.set(analystUUID, { ...cursor, analystName });
            } else {
                cursors.delete(analystUUID);
            }
            return cursors;
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
        console.log(`%c[SOCKET-SYNC] entity-created | type=${entityType} | uuid=${entity?.uuid}`, 'color: #00ffcc; font-weight: bold', entity);
        if (isTimelineSocketEntityType(entityType)) {
            applyTimelineEntityUpsert(entityType, entity);
            return;
        }
        upsertEntity(entityType, entity);
    });

    socket.on('entity-updated', (entityType: string, entity: any) => {
        console.log(`%c[SOCKET-SYNC] entity-updated | type=${entityType} | uuid=${entity?.uuid}`, 'color: #ffcc00; font-weight: bold', entity);
        if (isTimelineSocketEntityType(entityType)) {
            applyTimelineEntityUpsert(entityType, entity);
            return;
        }
        upsertEntity(entityType, entity);
    });

    socket.on('entity-deleted', (entityType: string, uuid: string) => {
        console.log(`%c[SOCKET-SYNC] entity-deleted | type=${entityType} | uuid=${uuid}`, 'color: #ff6666; font-weight: bold');
        if (applyTimelineEntityRemoval(entityType, uuid)) {
            return;
        }
        removeEntity(entityType, uuid);
    });

    socket.on('junction-updated', (table: string, data: any) => {
        console.log(`%c[SOCKET-SYNC] junction-updated | table=${table}`, 'color: #66ccff; font-weight: bold', data);
        applyTimelineJunctionUpdate(table, data);
    });

    socket.on('junction-deleted', (table: string, data: any) => {
        console.log(`%c[SOCKET-SYNC] junction-deleted | table=${table}`, 'color: #ff9999; font-weight: bold', data);
        applyTimelineJunctionDelete(table, data);
    });

    socket.on('lookup-updated', (lookupType: string, data: any[]) => {
        console.log(`%c[SOCKET-SYNC] lookup-updated | type=${lookupType} | count=${data?.length}`, 'color: #cc99ff; font-weight: bold');
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
    remoteCursors.set(new Map());
    localLastIncidentUUID = null;
}

export function emitViewRow(rowUUID: string) {
    if (!browser || !socket) return;
    const incident = get(currentSelectedIncident);

    // Check if called from an incident
    if (!incident?.uuid) return;
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

    // Check if called from an incident
    if (!incident?.uuid) return;
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

    // Don't emit if no incident is selected
    if (!incident?.uuid) return;

    socket.emit('update-user-status', {
        incidentUUID: incident.uuid as IncidentUUID,
        updates: { editingRow: isEditing ? rowUUID : null }
    });

    // Update local user info for tracking purposes
    if (localUserInfo) {
        localUserInfo.editingRow = isEditing ? rowUUID : null;
    }
}

// ============================================================================
// CURSOR SHARING
// ============================================================================

let lastCursorEmitTime = 0;
let cursorThrottleMs = 50; // Default ~20fps — overridden by server config on connect

/**
 * Emit cursor position to other users in the same incident room.
 * Coordinates should be percentages (0–100) of the tracked container.
 * Throttled to ~20fps to avoid flooding the socket.
 */
export function emitCursorMove(x: number, y: number) {
    if (!browser || !socket) return;

    const now = Date.now();
    if (now - lastCursorEmitTime < cursorThrottleMs) return;
    lastCursorEmitTime = now;

    const incident = get(currentSelectedIncident);
    if (!incident?.uuid) return;

    socket.emit('cursor-move', {
        incidentUUID: incident.uuid as IncidentUUID,
        cursor: { x, y, visible: true } as CursorPosition
    });
}

/**
 * Emit that the cursor has left the tracked area (mouse left the container).
 */
export function emitCursorLeave() {
    if (!browser || !socket) return;

    const incident = get(currentSelectedIncident);
    if (!incident?.uuid) return;

    socket.emit('cursor-move', {
        incidentUUID: incident.uuid as IncidentUUID,
        cursor: { x: 0, y: 0, visible: false } as CursorPosition
    });
}
