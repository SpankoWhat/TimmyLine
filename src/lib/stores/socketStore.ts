import { writable } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

let socket: Socket | null = null;

export const socketConnected = writable(false);

export function initializeSocket() {
    if (!browser || socket) return socket;
    
    socket = io({
        path: '/socket.io/',
        transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
        console.log('Socket connected');
        socketConnected.set(true);
    });
    
    socket.on('disconnect', () => {
        console.log('Socket disconnected');
        socketConnected.set(false);
    });
    
    return socket;
}

export function getSocket(): Socket | null {
    return socket;
}

// Keeping these here incase we need them later
export function joinIncident(incidentUuid: string) {
    if (!socket) {
        console.warn('Socket not initialized, cannot join incident');
        return;
    }
    socket.emit('join-incident', incidentUuid);
    console.log(`Emitted join-incident for ${incidentUuid}`);
}

export function leaveIncident(incidentUuid: string) {
    if (!socket) {
        console.warn('Socket not initialized, cannot leave incident');
        return;
    }
    socket.emit('leave-incident', incidentUuid);
    console.log(`Emitted leave-incident for ${incidentUuid}`);
}