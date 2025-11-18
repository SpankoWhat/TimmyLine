export interface UserInfo {
    analystUUID: string;
    analystName: string;
    rowUUID: string | null;
    isFocused: boolean;
    isEditing: boolean;
}

export type SocketId = string;
export type Incident = Map<SocketId, UserInfo>;
export type IncidentUUID = string;