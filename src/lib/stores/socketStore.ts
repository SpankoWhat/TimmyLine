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

export function getSocket(): Socket {
    if (!socket) throw new Error('Socket not initialized');
    return socket;
}

export function joinIncident(incidentUuid: string) {
    const socket = getSocket();
    socket.emit('join-incident', incidentUuid);
}

export function leaveIncident(incidentUuid: string) {
    const socket = getSocket();
    socket.emit('leave-incident', incidentUuid);
}