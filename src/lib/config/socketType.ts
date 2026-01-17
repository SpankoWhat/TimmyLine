export interface UserIncidentState {
    analystUUID: string;
    analystName: string;
    focusedRow: string | null;  // Row user is viewing/has expanded
    editingRow: string | null;  // Row user is actively editing
    socketIds: Set<SocketId>;   // All socket connections for this analyst
}

export interface UserStatusUpdate {
    focusedRow?: string | null;
    editingRow?: string | null;
}

export type SocketId = string;
export type AnalystUUID = string;
export type UsersInIncident = Map<AnalystUUID, UserIncidentState>;  // Changed from SocketId to AnalystUUID
export type IncidentUUID = string;