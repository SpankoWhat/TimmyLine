# Socket System Summary (Debug Context)

## Core Pieces
- Server entry: src/lib/server/socket/index.ts
- Client store: src/lib/stores/collabStore.ts
- Lobby usage (home): src/routes/home/+page.svelte
- Incident usage: src/routes/incident/[incident]/+page.svelte

## Data Shapes
- IncidentUUID: string (UUID)
- SocketId: string (socket.io id)
- AnalystUUID: string (analyst UUID - NEW: used as primary key for consolidation)
- UserIncidentState: { analystUUID: string; analystName: string; focusedRow: string|null; editingRow: string|null; socketIds: Set<SocketId> }
- Incident (server-side presence map): Map<AnalystUUID, UserIncidentState> (CHANGED: now keyed by AnalystUUID instead of SocketId)
- allActiveIncidentUsers (server): Map<IncidentUUID, Incident>
- socketToAnalystMap (server): Map<SocketId, AnalystUUID> (NEW: reverse lookup for quick socket→analyst mapping)

## Server (index.ts)
- Global singleton io stored on globalThis to survive HMR.
- validateSocketSession(): reads auth cookie (authjs.session-token), verifies in DB, attaches analystUUID/analystName to socket.data.
- initializeSocketIO(server): creates io with CORS ORIGIN; registers middleware for auth; wires events.
- Helper: getIncidentCounts() -> Record<IncidentUUID, number> derived from allActiveIncidentUsers (now counts analysts, not sockets).
- NEW: socketToAnalystMap for O(1) socket.id → analystUUID lookups in event handlers.

### Lobby Events
- inform-join-lobby (from client):
  - socket joins "lobby" room.
  - Builds onlineUsers: Map<AnalystUUID, {analystUUID, analystName}> by iterating allActiveIncidentUsers (CHANGED: now deduplicates by AnalystUUID).
  - Emits to the joiner:
    - lobby-users-list (Object.fromEntries(onlineUsers))
    - incident-user-counts (getIncidentCounts())
  - Broadcasts to lobby: user-joined-lobby (analystUUID, {analystUUID, analystName}) (CHANGED: sends AnalystUUID instead of socket.id)
- inform-leave-lobby:
  - socket leaves lobby
  - Broadcast: user-left-lobby (analystUUID) (CHANGED: sends AnalystUUID instead of socket.id)

### Incident Join
- inform-join-incident({ incidentUUID, analystUUID, analystName }):
  - Uses socket.data.* (server-trusted) instead of payload.
  - Leaves lobby if present.
  - Adds socket.id → analystUUID mapping to socketToAnalystMap.
  - Ensures incident map exists; creates Map<AnalystUUID, UserIncidentState> if first joiner (CHANGED: now keyed by AnalystUUID).
  - If analyst already in incident map, adds socket.id to existing socketIds set and returns (NEW: multi-tab support).
  - If new analyst, creates entry with analystUUID/analystName/focusedRow/editingRow null and socketIds set containing this socket.
  - Emits to incident room: user-joined-incident (analystUUID, userInfo) to ALL in room (CHANGED: sends AnalystUUID, only for NEW analysts).
  - If others present, emits to the new user: enrich-newUser-incidentState (Object.fromEntries(incident)).
  - Broadcast to lobby: incident-user-counts (getIncidentCounts()).

### Incident Leave
- inform-leave-incident({ incidentUUID }):
  - Look up analystUUID from socketToAnalystMap using socket.id.
  - Remove socket.id from analyst's socketIds set.
  - If analyst has no more sockets, remove analyst from incident map and emit user-left-incident (analystUUID).
  - Delete incident entry if empty.
  - socket leaves room and is removed from socketToAnalystMap.
  - Broadcast to lobby: incident-user-counts (getIncidentCounts()).

### User Presence Updates
- update-user-status({ incidentUUID, updates: { focusedRow?, editingRow? } }):
  - Look up analystUUID from socketToAnalystMap using socket.id.
  - Updates analyst state in incident map (consolidated across all tabs for this analyst).
  - Emits to incident room: user-status-updated (analystUUID, updates) (CHANGED: sends AnalystUUID).

### Disconnect
- On socket disconnect:
  - Look up analystUUID from socketToAnalystMap.
  - For each incident containing this analyst: remove socket.id from socketIds set.
  - If analyst has no more sockets: emit user-left-incident (analystUUID), remove analyst, delete incident if empty.
  - Remove from socketToAnalystMap.
  - If analyst was in any incident and has no more sockets: broadcast to lobby user-left-lobby (analystUUID) and incident-user-counts(getIncidentCounts()).

## Client (collabStore.ts)
- Stores: usersInLobby (Map<AnalystUUID, userInfo>), usersInEachIncident (Map<IncidentUUID, number>), usersInCurrentIncident (Map<AnalystUUID, UserIncidentState>), plus derived helpers (CHANGED: all now keyed by AnalystUUID).
- Initialization flow:
  - ensureSocketReady(): Promise<boolean>; waits for currentSelectedAnalyst store; initializes socket once; shared promise to avoid duplicate inits.
  - initializeSocket(): returns ensureSocketReady().
  - initializeSocketInternal(): creates socket.io client; sets localUserInfo from analyst (includes empty socketIds set); registers listeners.
- Disconnect: disconnectSocket() clears socket and promises and localUserInfo.

### Client Event Listeners
- lobby-users-list -> sets usersInLobby from object entries (now expects AnalystUUID keys).
- user-joined-lobby (analystUUID, userInfo) -> adds to usersInLobby (CHANGED: uses AnalystUUID as key).
- user-left-lobby (analystUUID) -> removes from usersInLobby (CHANGED: uses AnalystUUID as key).
- incident-user-counts -> sets usersInEachIncident Map.
- user-joined-incident (analystUUID, userInfo) -> add to usersInCurrentIncident (CHANGED: uses AnalystUUID as key).
- enrich-newUser-incidentState -> replace usersInCurrentIncident from object entries (now expects AnalystUUID keys).
- user-left-incident (analystUUID) -> remove from usersInCurrentIncident (CHANGED: uses AnalystUUID as key).
- user-status-updated (analystUUID, updates) -> patch focusedRow/editingRow for analyst in usersInCurrentIncident (CHANGED: consolidated across all tabs).
- entity-created/updated/deleted, lookup-updated -> delegate to cacheStore upsert/remove/update.

### Client Emitters
- joinLobbySocket(): await ensureSocketReady(); emit inform-join-lobby.
- leaveLobbySocket(): emit inform-leave-lobby; clear lobby stores.
- joinIncidentSocket(): await ensureSocketReady(); emit inform-join-incident with incidentUUID and localUserInfo; remembers last incident UUID.
- leaveIncidentSocket(): emit inform-leave-incident(lastIncidentUUID); clear usersInCurrentIncident.
- emitViewRow(rowUUID): emit update-user-status with focusedRow.
- emitIdle(): emit update-user-status clearing focusedRow/editingRow.
- emitEditingRowStatus(rowUUID|null, isEditing): emit update-user-status with editingRow.

## UI Entry Points
- Home page (routes/home/+page.svelte): onMount -> initializeSocket(); joinLobbySocket(); shows usersInLobby and usersInEachIncident counts; onDestroy -> leaveLobbySocket().
- Incident page (routes/incident/[incident]/+page.svelte): onMount -> set currentSelectedIncident, joinIncidentSocket(); onDestroy -> leaveIncidentSocket(); uses usersInCurrentIncident for presence and activity.

## Common Failure Modes (for debugging)
- Analyst not set yet -> ensureSocketReady waits; if not awaited in caller, emits may fail. Home/incident currently await? (home doesn’t await joinLobbySocket; joinLobbySocket awaits internally.)
- Lobby counts empty -> server builds onlineUsers from allActiveIncidentUsers (incident presence only). Users not in any incident won’t show in lobby list unless they join lobby explicitly.
- Incident counts missing -> emitted on lobby join, incident join/leave, disconnect. Check allActiveIncidentUsers correctness.
- Multiple initializations -> prevented via socketReadyPromise guard on client and globalForSocket on server.
- NEW: Multi-tab issues -> if socketToAnalystMap gets out of sync, socket events may fail to find correct analyst. Check disconnect cleanup.
- NEW: Memory leaks -> socketIds sets must be properly cleaned when sockets disconnect to prevent growing sets.

## Quick Event Matrix
- Client → Server: inform-join-lobby, inform-leave-lobby, inform-join-incident, inform-leave-incident, update-user-status
- Server → Client: lobby-users-list, user-joined-lobby (analystUUID), user-left-lobby (analystUUID), incident-user-counts, user-joined-incident (analystUUID), enrich-newUser-incidentState, user-left-incident (analystUUID), user-status-updated (analystUUID), entity-created/updated/deleted, lookup-updated

## Keys to Inspect for Lobby Stats Issues
- Server: getIncidentCounts(), inform-join-lobby flow, disconnect cleanup, inform-leave-incident cleanup, socketToAnalystMap consistency.
- Client: usersInEachIncident listener, usersInLobby listener, joinLobbySocket/leaveLobbySocket sequencing.
- Data path: allActiveIncidentUsers (server) → incident-user-counts emit → client usersInEachIncident store → home UI badges.
- NEW: Multi-tab debugging: Check socketToAnalystMap for orphaned entries, verify socketIds sets are cleaned up on disconnect.

## Multi-Tab Consolidation Benefits
- **Accurate User Counts**: Incident counts reflect unique analysts, not socket connections
- **Consolidated Presence**: Same analyst appears once regardless of open tabs  
- **Synchronized Status**: Focus/editing status shared across all tabs for the same analyst
- **Reduced Broadcast Noise**: Updates sent per-analyst rather than per-socket
- **Backward Compatible**: Existing UI logic works with automatic deduplication
