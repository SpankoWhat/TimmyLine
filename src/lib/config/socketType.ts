export interface CursorPosition {
    x: number;       // Percentage of tracked container width (0–100)
    y: number;       // Percentage of tracked container height (0–100)
    visible: boolean; // Whether the cursor is inside the tracked area
}

export interface UserIncidentState {
    analystUUID: string;
    analystName: string;
    focusedRow: string | null;  // Row user is viewing/has expanded
    editingRow: string | null;  // Row user is actively editing
    cursor: CursorPosition | null; // Live cursor position within the incident view
    socketIds: SocketId[];      // All socket connections for this analyst
}

export interface UserStatusUpdate {
    focusedRow?: string | null;
    editingRow?: string | null;
}

export type SocketId = string;
export type AnalystUUID = string;
export type UsersInIncident = Map<AnalystUUID, UserIncidentState>;  // Changed from SocketId to AnalystUUID
export type IncidentUUID = string;