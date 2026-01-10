# Socket System Summary (Debug Context)

## Core Pieces
- Server entry: src/lib/server/socket/index.ts
- Client store: src/lib/stores/collabStore.ts
- Lobby usage (home): src/routes/home/+page.svelte
- Incident usage: src/routes/incident/[incident]/+page.svelte

## Data Shapes
- IncidentUUID: string (UUID)
- SocketId: string (socket.io id)
- UserIncidentState: { analystUUID: string; analystName: string; focusedRow: string|null; editingRow: string|null }
- Incident (server-side presence map): Map<SocketId, UserIncidentState>
- allActiveIncidentUsers (server): Map<IncidentUUID, Incident>

## Server (index.ts)
- Global singleton io stored on globalThis to survive HMR.
- validateSocketSession(): reads auth cookie (authjs.session-token), verifies in DB, attaches analystUUID/analystName to socket.data.
- initializeSocketIO(server): creates io with CORS ORIGIN; registers middleware for auth; wires events.
- Helper: getIncidentCounts() -> Record<IncidentUUID, number> derived from allActiveIncidentUsers.

### Lobby Events
- inform-join-lobby (from client):
  - socket joins "lobby" room.
  - Builds onlineUsers: Map<SocketId, {analystUUID, analystName}> by iterating allActiveIncidentUsers.
  - Emits to the joiner:
    - lobby-users-list (Object.fromEntries(onlineUsers))
    - incident-user-counts (getIncidentCounts())
  - Broadcasts to lobby: user-joined-lobby (socket.id, {analystUUID, analystName})
- inform-leave-lobby:
  - socket leaves lobby
  - Broadcast: user-left-lobby (socket.id)

### Incident Join
- inform-join-incident({ incidentUUID, analystUUID, analystName }):
  - Uses socket.data.* (server-trusted) instead of payload.
  - Leaves lobby if present.
  - Ensures incident map exists; creates Map<SocketId, UserIncidentState> if first joiner.
  - If socket already in incident map, return.
  - Adds entry to incident map with analystUUID/analystName/focusedRow/editingRow null.
  - Emits to incident room: user-joined-incident (socket.id, userInfo) to ALL in room.
  - If others present, emits to the new user: enrich-newUser-incidentState (Object.fromEntries(incident)).
  - Broadcast to lobby: incident-user-counts (getIncidentCounts()).

### Incident Leave
- inform-leave-incident({ incidentUUID }):
  - Remove user from incident map; delete incident entry if empty.
  - Emit to incident room: user-left-incident (socket.id).
  - socket leaves room.
  - Broadcast to lobby: incident-user-counts (getIncidentCounts()).

### User Presence Updates
- update-user-status({ incidentUUID, updates: { focusedRow?, editingRow? } }):
  - Updates user state in incident map; emits to incident room: user-status-updated (socket.id, updates).

### Disconnect
- On socket disconnect:
  - For each incident containing socket.id: emit user-left-incident, remove user, delete incident if empty.
  - If user was in any incident: broadcast to lobby user-left-lobby and incident-user-counts(getIncidentCounts()).

## Client (collabStore.ts)
- Stores: usersInLobby (Map), usersInEachIncident (Map<IncidentUUID, number>), usersInCurrentIncident (Map<SocketId, UserIncidentState>), plus derived helpers.
- Initialization flow:
  - ensureSocketReady(): Promise<boolean>; waits for currentSelectedAnalyst store; initializes socket once; shared promise to avoid duplicate inits.
  - initializeSocket(): returns ensureSocketReady().
  - initializeSocketInternal(): creates socket.io client; sets localUserInfo from analyst; registers listeners.
- Disconnect: disconnectSocket() clears socket and promises and localUserInfo.

### Client Event Listeners
- lobby-users-list -> sets usersInLobby from object entries.
- user-joined-lobby -> adds to usersInLobby.
- user-left-lobby -> removes from usersInLobby.
- incident-user-counts -> sets usersInEachIncident Map.
- user-joined-incident -> add to usersInCurrentIncident.
- enrich-newUser-incidentState -> replace usersInCurrentIncident from object entries.
- user-left-incident -> remove from usersInCurrentIncident.
- user-status-updated -> patch focusedRow/editingRow for user in usersInCurrentIncident.
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

## Quick Event Matrix
- Client → Server: inform-join-lobby, inform-leave-lobby, inform-join-incident, inform-leave-incident, update-user-status
- Server → Client: lobby-users-list, user-joined-lobby, user-left-lobby, incident-user-counts, user-joined-incident, enrich-newUser-incidentState, user-left-incident, user-status-updated, entity-created/updated/deleted, lookup-updated

## Keys to Inspect for Lobby Stats Issues
- Server: getIncidentCounts(), inform-join-lobby flow, disconnect cleanup, inform-leave-incident cleanup.
- Client: usersInEachIncident listener, usersInLobby listener, joinLobbySocket/leaveLobbySocket sequencing.
- Data path: allActiveIncidentUsers (server) → incident-user-counts emit → client usersInEachIncident store → home UI badges.
