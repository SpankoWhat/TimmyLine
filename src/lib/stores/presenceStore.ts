import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { getSocket } from './socketStore';

// Import types only to avoid circular dependency issues
import type { Incident, Analyst } from '$lib/server/database';
import type { Writable } from 'svelte/store';

// We'll access these stores lazily to avoid initialization issues
let currentSelectedIncident: Writable<Incident | null> | null = null;
let currentSelectedAnalyst: Writable<Analyst | null> | null = null;

// Lazy load stores to avoid circular dependency
if (browser) {
	import('./cacheStore').then((module) => {
		currentSelectedIncident = module.currentSelectedIncident;
		currentSelectedAnalyst = module.currentSelectedAnalyst;
	});
}

// ============================================================================
// TYPES
// ============================================================================

export type UserPresence = {
	socketId: string;
	analystUuid: string;
	analystName: string;
	color: string;
	currentRow: string | null;
	action: 'viewing' | 'editing' | 'idle';
	lastSeen: number;
};

export type RoomPresence = {
	incidentUuid: string;
	users: Map<string, UserPresence>;
};

// ============================================================================
// STORES
// ============================================================================

// Map of incident UUID to room presence
export const presenceByIncident = writable<Map<string, RoomPresence>>(new Map());

// Helper function to safely get current incident
function getCurrentIncident(): Incident | null {
	if (!currentSelectedIncident) return null;
	try {
		return get(currentSelectedIncident);
	} catch {
		return null;
	}
}

// Helper function to safely get current analyst
function getCurrentAnalyst(): Analyst | null {
	if (!currentSelectedAnalyst) return null;
	try {
		return get(currentSelectedAnalyst);
	} catch {
		return null;
	}
}

// Derived store: Get all users in current incident room
export const currentRoomUsers = derived(
	presenceByIncident,
	($presence) => {
		const incident = getCurrentIncident();
		if (!incident?.uuid) return [];
		const room = $presence.get(incident.uuid);
		return room ? Array.from(room.users.values()) : [];
	}
);

// Derived store factory: Get users on a specific row
export const getUsersOnRow = derived(
	presenceByIncident,
	($presence) => {
		return (rowUuid: string): UserPresence[] => {
			const incident = getCurrentIncident();
			if (!incident?.uuid) return [];
			const room = $presence.get(incident.uuid);
			if (!room) return [];

			return Array.from(room.users.values())
				.filter((user) => user.currentRow === rowUuid)
				.sort((a, b) => {
					// Editing users first
					if (a.action === 'editing' && b.action !== 'editing') return -1;
					if (b.action === 'editing' && a.action !== 'editing') return 1;
					return 0;
				});
		};
	}
);

// ============================================================================
// INITIALIZATION
// ============================================================================

let presenceInitialized = false;
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Initialize presence tracking
 * Call this once during app initialization
 */
export function initializePresence() {
	if (!browser || presenceInitialized) return;

	const socket = getSocket();
	if (!socket) {
		console.warn('Socket not initialized, cannot set up presence');
		return;
	}

	presenceInitialized = true;

	// ========================================================================
	// INCOMING EVENTS - Listen for other users' presence
	// ========================================================================

	// When a user joins the room
	socket.on('user-joined', (user: Omit<UserPresence, 'lastSeen'>) => {
		console.log(`👤 User joined: ${user.analystName}`);
		const incident = getCurrentIncident();
		if (!incident?.uuid) return;

		presenceByIncident.update((map) => {
			let room = map.get(incident.uuid);
			if (!room) {
				room = { incidentUuid: incident.uuid, users: new Map() };
				map.set(incident.uuid, room);
			}
			room.users.set(user.socketId, {
				...user,
				lastSeen: Date.now()
			});
			return new Map(map);
		});
	});

	// When a user leaves the room
	socket.on('user-left', (data: { socketId: string; incidentUuid: string }) => {
		console.log(`👤 User left: ${data.socketId}`);
		presenceByIncident.update((map) => {
			const room = map.get(data.incidentUuid);
			if (room) {
				room.users.delete(data.socketId);
			}
			return new Map(map);
		});
	});

	// When a user changes their focus
	socket.on(
		'user-focus-changed',
		(data: { socketId: string; rowUuid: string | null; action: 'viewing' | 'editing' | 'idle' }) => {
			const incident = getCurrentIncident();
			if (!incident?.uuid) return;

			presenceByIncident.update((map) => {
				const room = map.get(incident.uuid);
				const user = room?.users.get(data.socketId);
				if (user) {
					user.currentRow = data.rowUuid;
					user.action = data.action;
					user.lastSeen = Date.now();
				}
				return new Map(map);
			});
		}
	);

	// Receive initial room state when joining
	socket.on('room-users', (data: { incidentUuid: string; users: Omit<UserPresence, 'lastSeen'>[] }) => {
		console.log(`📋 Received room users for ${data.incidentUuid}:`, data.users.length);
		presenceByIncident.update((map) => {
			const room: RoomPresence = {
				incidentUuid: data.incidentUuid,
				users: new Map(
					data.users.map((u) => [
						u.socketId,
						{
							...u,
							lastSeen: Date.now()
						}
					])
				)
			};
			map.set(data.incidentUuid, room);
			return new Map(map);
		});
	});

	console.log('✅ Presence tracking initialized');
}

/**
 * Cleanup presence tracking
 */
export function cleanupPresence() {
	presenceInitialized = false;
}

// ============================================================================
// OUTGOING EVENTS - Broadcast your presence to others
// ============================================================================

/**
 * Emit when you start viewing/hovering a row
 */
export function emitRowViewing(rowUuid: string) {
	const socket = getSocket();
	const incident = getCurrentIncident();
	if (!socket || !incident?.uuid) return;

	socket.emit('focus-row', {
		incidentUuid: incident.uuid,
		rowUuid,
		action: 'viewing'
	});
}

/**
 * Emit when you start editing a row
 */
export function emitRowEditing(rowUuid: string) {
	const socket = getSocket();
	const incident = getCurrentIncident();
	if (!socket || !incident?.uuid) return;

	socket.emit('focus-row', {
		incidentUuid: incident.uuid,
		rowUuid,
		action: 'editing'
	});
}

/**
 * Emit when you stop focusing on a row
 */
export function emitRowIdle() {
	const socket = getSocket();
	const incident = getCurrentIncident();
	if (!socket || !incident?.uuid) return;

	socket.emit('focus-row', {
		incidentUuid: incident.uuid,
		rowUuid: null,
		action: 'idle'
	});
}

/**
 * Join incident room with analyst info
 */
export function joinIncidentWithPresence(incidentUuid: string) {
	const socket = getSocket();
	const analyst = getCurrentAnalyst();
	if (!socket || !analyst) return;

	socket.emit('join-incident', {
		incidentUuid,
		analystUuid: analyst.uuid,
		analystName: analyst.full_name || analyst.username
	});
}

/**
 * Leave incident room
 */
export function leaveIncidentWithPresence(incidentUuid: string) {
	const socket = getSocket();
	const analyst = getCurrentAnalyst();
	if (!socket || !analyst) return;

	socket.emit('leave-incident', {
		incidentUuid,
		analystUuid: analyst.uuid,
		analystName: analyst.full_name || analyst.username
	});
}
