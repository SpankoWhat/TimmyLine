# Features
A couple general things I want each analyst to know when using the app. 
These things dictate what n eeds to be stored in data and what listeners to setup.

## Main Page Features
- How many users are online
- Which user is in which incident

## Incident Page Features
- How many users are in this page
- Which users are in this page
- Which row a user is focused on
- Which user is focused on which row

# Current Emiter
| Emitter String | Function | Arguments |
| --- | --- | --- |
| `inform-join-incident`| inform server that user joined the room (incident) | `incidentUUID: string, analystUUID: string, analystName: string` |
| `user-joined-incident`| inform users in room that a new user joined - sends back user details | `userSocketId: SocketId, user: UserInfo` |
| `enrich-newUser-incidentState`| sends the incident's current status to the new user | `incidentDetails: Incident` |
| `inform-leave-incident` | inform server that user left the room (incident) | `incidentUUID: string`|
| `user-left-incident` | inform users in room that a user left the room (incident) | `socketId: string` |
| `inform-focus-change` | inform server that focus has changed |  `incidentUUID: string, rowUUID: string \| null` |
| `user-focused-row` | inform users in room that a user has focused on a row | `socketId: string, rowUUID: string` |
| `inform-edit-row` | inform server that user's editing status | `incidentUUID:string, rowUUID: string \| null`|
| `user-editing-row` | inform server that user's editing status | `incidentUUID:string, rowUUID: string \| null`|
| `entity-created` | (client→server) inform server that an entity was created | `incidentUUID: string, entityType: string, entity: any` |
| `entity-created` | (server→client) inform users in room that an entity was created | `entityType: string, entity: any` |
| `entity-updated` | (client→server) inform server that an entity was updated | `incidentUUID: string, entityType: string, entity: any` |
| `entity-updated` | (server→client) inform users in room that an entity was updated | `entityType: string, entity: any` |
| `entity-deleted` | (client→server) inform server that an entity was deleted | `incidentUUID: string, entityType: string, uuid: string` |
| `entity-deleted` | (server→client) inform users in room that an entity was deleted | `entityType: string, uuid: string` |
| `lookup-updated` | (client→server) inform server that a lookup table was updated | `lookupType: string, data: any[]` |
| `lookup-updated` | (server→client) broadcast to ALL users that a lookup table was updated | `lookupType: string, data: any[]` |

# Current Local-Server Data store
To achieve the things described above this is what I decided to store:

```ts
interface UserInfo {
    analystUuid: string;
    analystName: string;
    color: string;
    rowUUID: string | null;
    isFocused: boolean;
    isEditing: boolean;
}

type SocketId = string;
type Incident = Map<SocketId, UserInfo>;
type IncidentUUID = string;
```

Diff types of socket emitters:
```ts
// Sends a response to the caller
socket.emit()

// Send updates to all except sender 
socket.to().emit()

// Send updates to all including the sender
io.to().emity()
```