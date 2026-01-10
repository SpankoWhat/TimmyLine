export interface UserIncidentState {
    analystUUID: string;
    analystName: string;
    focusedRow: string | null;  // Row user is viewing/has expanded
    editingRow: string | null;  // Row user is actively editing
}

export interface UserStatusUpdate {
    focusedRow?: string | null;
    editingRow?: string | null;
}

export type SocketId = string;
export type Incident = Map<SocketId, UserIncidentState>;
export type IncidentUUID = string;