# TimmyLine

TimmyLine is a cybersecurity incident response timeline visualization and management tool. It is built with SvelteKit 2 (Svelte 5), Drizzle ORM, and SQLite, and provides a data-dense, terminal-aesthetic interface for tracking incidents, timeline events, investigation actions, entities, and annotations throughout incident response workflows. It supports real-time multi-analyst collaboration via Socket.IO, OAuth-based authentication, API key access, and a Model Context Protocol (MCP) server for AI agent integration.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Database Management](#database-management)
- [MCP Server Integration](#mcp-server-integration)
- [Features](#features)
  - [Incident Management](#incident-management)
  - [Timeline Views](#timeline-views)
  - [Entity and Annotation Tracking](#entity-and-annotation-tracking)
  - [Relationship Management](#relationship-management)
  - [Real-Time Collaboration](#real-time-collaboration)
  - [Export](#export)
  - [Command Palette](#command-palette)
  - [Display Field Configuration](#display-field-configuration)
  - [Settings](#settings)
- [Authentication](#authentication)
- [API Reference](#api-reference)
- [Architecture](#architecture)
  - [Database Schema](#database-schema)
  - [Service Layer](#service-layer)
  - [Client SDK](#client-sdk)
  - [State Management](#state-management)
  - [Middleware and Hooks](#middleware-and-hooks)
- [Project Structure](#project-structure)
- [Scripts Reference](#scripts-reference)

---

## Quick Start

### Prerequisites

- Node.js v18 or later
- npm, pnpm, or yarn
- Native build tools for `better-sqlite3` (typically installed automatically)

### 1. Clone and Install

```powershell
git clone https://github.com/SpankoWhat/TimmyLine.git
cd TimmyLine
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your OAuth credentials and paths:

```powershell
cp example.env .env
```

See [Environment Variables](#environment-variables) for details on each variable.

### 3. Initialize the Database

Push the schema to a local SQLite database:

```powershell
npm run db:push
```

Optionally seed with default lookup data (event types, action types, entity types, etc.):

```powershell
npm run db:seed
```

### 4. Start the Development Server

```powershell
npm run dev
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal output).

---

## Environment Variables

Create a `.env` file in the project root. See `example.env` for a template.

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Secret used to sign session tokens. Generate with `openssl rand -base64 32`. |
| `AUTH_TRUST_HOST` | Set to `true` in production environments. Required by Auth.js. |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret. |
| `MICROSOFT_ENTRA_ID_CLIENT_ID` | Microsoft Entra ID (Azure AD) application client ID. |
| `MICROSOFT_ENTRA_ID_CLIENT_SECRET` | Microsoft Entra ID client secret. |
| `MICROSOFT_ENTRA_ID_TENANT_ID` | Microsoft Entra ID tenant ID. |
| `GITHUB_CLIENT_ID` | GitHub OAuth application client ID. |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth application client secret. |
| `DATABASE_URL` | Absolute path to the SQLite database file. |
| `LOG_FILEPATH` | Absolute path to the log output file. |
| `LOG_WRITETOPATH` | Set to `true` to enable file logging. |
| `ORIGIN` | The application origin URL, used for Socket.IO CORS. Example: `http://localhost:5173`. |

---

## Database Management

The project uses Drizzle ORM with SQLite (via `better-sqlite3`). The following npm scripts are available:

| Command | Description |
|---|---|
| `npm run db:push` | Push the current schema to the database (development, no migration files). |
| `npm run db:generate` | Generate migration files from schema changes. |
| `npm run db:migrate` | Run pending migrations against the database. |
| `npm run db:seed` | Populate lookup tables with default reference data. |
| `npm run db:studio` | Open Drizzle Studio, a visual database manager. |

---

## MCP Server Integration

TimmyLine exposes a Model Context Protocol (MCP) endpoint for AI agent integration. The MCP server provides 37 tools covering the full CRUD lifecycle for all resources, plus relationship management and export operations.

### Connection

The MCP endpoint is available at `/api/mcp` and requires an API key for authentication. Generate an API key from the Settings page in the application.

To connect an MCP client, configure it with the following:

```json
{
  "timmyline": {
    "url": "http://localhost:5173/api/mcp",
    "headers": {
      "Authorization": "tml_your_api_key_here"
    }
  }
}
```

### Available Tool Categories

| Category | Tools |
|---|---|
| Read | `health_check`, `list_incidents`, `list_timeline_events`, `get_enriched_timeline`, `list_investigation_actions`, `list_entities`, `list_annotations`, `list_analysts`, `list_lookup_values`, `export_incident_data`, `export_incident_html` |
| Create | `create_incident`, `create_timeline_event`, `create_investigation_action`, `create_entity`, `create_annotation`, `create_analyst`, `create_lookup_entry` |
| Update | `update_incident`, `update_timeline_event`, `update_investigation_action`, `update_entity`, `update_annotation`, `update_analyst`, `update_lookup_entry`, `update_event_entity_link` |
| Link | `link_event_entity`, `link_action_event`, `link_action_entity` |
| Delete | `delete_incident`, `delete_timeline_event`, `delete_investigation_action`, `delete_entity`, `delete_annotation`, `delete_analyst`, `delete_lookup_entry`, `unlink_junction` |

All MCP tools call service functions in-process (no HTTP round-trip). Write and delete operations enforce role-based access control. The `delete_incident` tool requires the `on-point lead` role.

### Session Management

Each MCP client receives its own server instance scoped to its authenticated identity. Sessions are stored in memory with a 30-minute idle timeout and automatic cleanup.

---

## Features

### Incident Management

Incidents are the top-level organizational unit. Each incident has a title, optional SOAR ticket ID, priority level (critical, high, medium, low), and status (In Progress, Post-Mortem, Closed).

The dashboard displays summary statistics (total incidents, counts by priority and status) and a list of recent incidents with real-time analyst presence counts. A full incidents page provides sortable columns and text filtering.

### Timeline Views

The incident detail page is the primary workspace. It displays all timeline events and investigation actions for a selected incident. Two view modes are available, toggled via the view switcher:

**Log View** -- A dense, row-based layout optimized for data throughput. Each row shows a timestamp, pinned display fields, and a notes preview. Rows expand to reveal full field details, a JSON data viewer with syntax highlighting, and a relationship tree rendered with ASCII-style connectors. The relationship tree displays linked entities, events, and actions in a hierarchical format.

**Vertical Timeline View** -- A chronological card-based layout. Events and actions are rendered as visual cards along a vertical axis. The view automatically inserts date separators, detects time gaps exceeding 30 minutes, and clusters rapid-fire items (4 or more within 60 seconds) into collapsible groups. Each card expands to show the same detail view as the log view.

Both views support:
- Real-time text search across all fields.
- Toggle to show or hide soft-deleted items.
- Per-row collaboration presence indicators.
- Edit locking when another analyst is editing a row.

### Entity and Annotation Tracking

Entities represent indicators of compromise (IOCs) and assets involved in an incident: IP addresses, domains, file hashes, user accounts, hosts, and others. Each entity has a type, identifier, display name, status, criticality level, and optional JSON attributes.

Annotations capture analyst notes, hypotheses, observations, questions, and other commentary. They support a confidence level, a hypothesis flag, and a free-text reference field.

Both entities and annotations are accessible via a tabbed side panel that can be displayed as an inline dropdown or detached into a floating, draggable, resizable window. Clicking an entity or annotation in the panel highlights its related timeline items.

### Relationship Management

TimmyLine models relationships between timeline items through junction tables:

- **Event-Entity**: Links events to entities with a role (e.g., source, target) and optional context.
- **Action-Event**: Links actions to the events they relate to, with a relation type.
- **Action-Entity**: Links actions to entities with a relation type.
- **Annotation References**: Polymorphic links from annotations to events, actions, entities, or incidents.

Relationships are managed inline through the RelationshipBuilder component in event and action modals. Existing links can be removed or restored, and new links are added via dropdown selectors for the target item, relation type, and optional context.

### Real-Time Collaboration

Socket.IO provides real-time presence tracking across two tiers:

**Lobby** -- The dashboard and incident list pages show which analysts are online and how many are active in each incident.

**Incident Rooms** -- When an analyst opens an incident, they join a room scoped to that incident. The system tracks:
- Which analysts are viewing the incident (displayed as an avatar stack in the header).
- Which timeline row each analyst is focused on (displayed as small user indicators on each row).
- Which timeline row an analyst has open for editing (locks the edit button for other analysts).

Multiple browser tabs per analyst are supported. An analyst is only shown as having left an incident when all of their tabs have disconnected or navigated away.

Data mutations (creates, updates, deletes) are broadcast to all connected clients in the relevant incident room, triggering automatic cache updates without requiring a page refresh.

### Export

An incident can be exported as a self-contained HTML file. The export includes:
- Incident metadata and summary statistics.
- The complete timeline (events and actions) with all field data.
- Linked entities and annotations.
- An interactive interface with expandable rows, a JSON viewer, and an entities/annotations side panel.
- All styles embedded inline (extracted from the application CSS at export time).

The exported file has no external dependencies and can be opened in any browser.

### Command Palette

A global command palette is accessible via `Ctrl+K` from any page. It provides:

- Navigation commands: Dashboard, Incidents, Settings.
- Creation commands: New Incident, Event, Action, Entity, Annotation (context-sensitive; some require an active incident).
- Configuration commands: Manage event, entity, action, and annotation types.
- Export: Download the current incident as an HTML file.
- Recent incidents: Quick access to the last five viewed incidents.

Results are filtered by a fuzzy text search and grouped by category. Full keyboard navigation is supported.

### Display Field Configuration

The fields displayed for events and actions in the timeline are configurable per user. The Field Selector panel allows:

- Toggling visibility of individual fields.
- Pinning fields to appear in the summary row.
- Drag-and-drop reordering of pinned fields.
- Auto-discovery of dynamic fields from JSON data blobs (`event_data`, `action_data`).
- Reset to default configuration.

Preferences are persisted to `localStorage`.

### Settings

The settings area includes:

**API Key Management** -- Generate API keys with a name, role scope (Read-only, Analyst, On-Point Lead), and optional expiration (never, 30 days, 90 days, 1 year). The plaintext key is shown once at creation. Active and inactive (revoked/expired) keys are listed with metadata including creation date, last used date, and expiration.

**Lookup Table Management** -- Five lookup tables are configurable: Event Types, Action Types, Entity Types, Annotation Types, and Relation Types. Each table supports adding, editing, soft-deleting, and restoring entries. These lookup values populate dropdown menus throughout the application.

---

## Authentication

TimmyLine uses Auth.js (`@auth/sveltekit`) with database-backed sessions stored in SQLite via the Drizzle adapter. Sessions have a 30-day maximum age.

### OAuth Providers

Three providers are supported:
- **Google** -- Full OAuth 2.0 with offline access.
- **Microsoft Entra ID** (Azure AD) -- Tenant-scoped with `openid profile email User.Read` scopes.
- **GitHub** -- Standard OAuth application.

On first login, an analyst record is automatically created using the email prefix as the username, with a default `analyst` role. If an analyst record with a matching email already exists but lacks a `user_id`, it is linked automatically.

### API Key Authentication

API keys provide programmatic access for scripts, CI/CD pipelines, and MCP clients. Keys are prefixed with `tml_` and stored as SHA-256 hashes. Each key is associated with a role that determines its access level. The effective role is the minimum of the key role and the analyst's actual role.

### Authorization Levels

| Level | Roles | Description |
|---|---|---|
| Read | Any authenticated user | View all resources. |
| Write | `analyst`, `on-point lead` | Create, update, and soft-delete resources. |
| Admin | `on-point lead` | Hard-delete operations, incident deletion. |

---

## API Reference

All endpoints return JSON responses. Errors follow the format `{ error, code }` with an appropriate HTTP status code.

### Core Resources

| Endpoint | Methods | Description |
|---|---|---|
| `/api/incidents` | GET, POST | List incidents (filterable) or create a new incident. |
| `/api/incidents/[uuid]` | GET, PATCH, DELETE | Retrieve, update, or soft-delete a single incident. |
| `/api/events` | GET, POST | List timeline events (filterable) or create a new event. |
| `/api/events/[uuid]` | PATCH, DELETE | Update or soft-delete a single event. |
| `/api/actions` | GET, POST | List investigation actions (filterable) or create a new action. |
| `/api/actions/[uuid]` | PATCH, DELETE | Update or soft-delete a single action. |
| `/api/entities` | GET, POST | List entities (filterable) or create a new entity. |
| `/api/entities/[uuid]` | PATCH, DELETE | Update or soft-delete a single entity. |
| `/api/annotations` | GET, POST | List annotations (filterable) or create a new annotation. |
| `/api/annotations/[uuid]` | PATCH, DELETE | Update or soft-delete a single annotation. |
| `/api/analysts` | GET, POST | List analysts (filterable) or create a new analyst. |
| `/api/analysts/[uuid]` | PATCH, DELETE | Update or soft-delete a single analyst. |

### Lookup Tables

| Endpoint | Methods | Description |
|---|---|---|
| `/api/lookups/[table]` | GET, POST, PATCH, DELETE | CRUD for lookup entries. The `table` parameter accepts: `event_type`, `action_type`, `entity_type`, `annotation_type`, `relation_type`. PATCH supports `action: 'soft-delete'` and `action: 'restore'`. |

### Junction Tables

| Endpoint | Methods | Description |
|---|---|---|
| `/api/event-entities` | POST, PATCH, DELETE | Link, update, or unlink an event and an entity. |
| `/api/action-events` | POST, PATCH, DELETE | Link, update, or unlink an action and an event. |
| `/api/action-entities` | POST, PATCH, DELETE | Link, update, or unlink an action and an entity. |

### Special Endpoints

| Endpoint | Methods | Description |
|---|---|---|
| `/api/timeline` | GET | Enriched timeline query returning events and actions with all linked relationships. |
| `/api/export` | GET | Download a self-contained HTML export of an incident. Requires `incident_id` query parameter. |
| `/api/api-keys` | GET, POST, DELETE | List, create, or revoke API keys for the current session user. |
| `/api/health` | GET | Health check reporting database connectivity, MCP server status, and active session count. No authentication required. |
| `/api/mcp` | POST, GET, DELETE | MCP Streamable HTTP endpoint. POST for JSON-RPC requests, GET for SSE streams, DELETE to terminate sessions. |

---

## Architecture

### Database Schema

The database uses a three-tier table architecture:

**Tier 1 -- Lookup Tables**: Five reference tables (`event_type`, `action_type`, `entity_type`, `annotation_type`, `relation_type`) containing static categorization data. All share the same structure: `name` (primary key), `description`, and `deleted_at` (soft-delete).

**Tier 1 -- Auth Tables**: `auth_users`, `auth_accounts`, `auth_sessions`, `auth_verification_tokens`, and `api_keys` handle authentication and authorization.

**Tier 2 -- Core Tables**: The main data entities.

| Table | Key Fields |
|---|---|
| `incidents` | uuid, title, soar_ticket_id, priority, status |
| `timeline_events` | uuid, incident_id, event_type, occurred_at, discovered_at, severity, confidence, source, source_reliability, event_data (JSON), notes, tags (JSON) |
| `investigation_actions` | uuid, incident_id, action_type, performed_at, result, tool_used, action_data (JSON), notes, next_steps, tags (JSON) |
| `entities` | uuid, incident_id, entity_type, identifier, display_name, status, criticality, attributes (JSON), tags (JSON) |
| `annotations` | uuid, incident_id, annotation_type, content, confidence, is_hypothesis, refers_to, tags (JSON) |
| `analysts` | uuid, user_id, username, email, full_name, role, active |

All core tables support soft deletion via a `deleted_at` timestamp. Events and actions track the creating analyst (`discovered_by`, `actioned_by`). Entities enforce a unique constraint on `(incident_id, identifier)`.

**Tier 3 -- Junction Tables**: `action_events`, `event_entities`, `action_entities`, and `annotation_references` model many-to-many relationships. The `annotation_references` table is polymorphic, linking annotations to events, actions, entities, or incidents via a `reference_type` discriminator.

### Service Layer

All database operations are encapsulated in service modules under `src/lib/server/services/`. Both API route handlers and MCP tool handlers call into the same service functions. This ensures consistent validation, authorization, and Socket.IO broadcast behavior regardless of the entry point.

Services use a `ServiceContext` object carrying the actor's UUID and role. Mutations broadcast changes via Socket.IO to the relevant incident room or globally, depending on the entity type.

### Client SDK

A typed fetch-based SDK in `src/lib/client/` provides programmatic access to all API endpoints. All client-side code uses the SDK (via `import { api } from '$lib/client'`) rather than calling `fetch()` directly.

```typescript
import { api } from '$lib/client';

// Incidents
await api.incidents.list({ status: 'In Progress' });
await api.incidents.create({ title: 'Phishing Campaign', priority: 'high' });
await api.incidents.update(uuid, { status: 'Closed' });
await api.incidents.delete(uuid);

// Enriched timeline
await api.timeline.getEnriched({ incident_id: uuid });

// Junctions
await api.eventEntities.create({ event_id, entity_id, role: 'source' });

// Lookups
await api.lookups.list('event_type');

// Export
const response = await api.export.download(incident_id);
```

### State Management

Global state is managed through Svelte stores in `src/lib/stores/cacheStore.ts`:

- **Selection stores**: `currentSelectedIncident`, `currentSelectedAnalyst` -- the currently active items.
- **Collection stores**: `currentCachedIncidents`, `currentCachedTimeline`, `currentCachedAnnotations`, `currentCachedEntities` -- fetched data sets.
- **Lookup stores**: `eventTypes`, `actionTypes`, `entityTypes`, `annotationTypes`, `relationTypes`, `analysts` -- reference data.
- **Derived stores**: `incidentStats`, `entityStats`, `investigationStats`, `knownJsonKeys` -- computed from collections.
- **UI stores**: `showDeletedItems`, `currentTimelineView`, `highlightedItemUuids` -- user preferences.

Collaboration state is tracked separately in `src/lib/stores/collabStore.ts`, managing Socket.IO connections, room membership, and per-user presence data.

Within Svelte components, Svelte 5 runes (`$state()`, `$derived()`, `$props()`) are used for local reactivity. Svelte stores are used only in the store files themselves.

### Middleware and Hooks

The server hook chain (`src/hooks.server.ts`) processes requests through four stages in sequence:

1. **API Key Handler** -- Checks the `Authorization` header for a `tml_` prefixed token, validates the key, and synthesizes a session if valid.
2. **Auth Handler** -- Auth.js session resolution for cookie-based sessions.
3. **Authorization Handler** -- Route protection. Public routes (`/login`, `/auth`, `/api/health`, `/api/mcp`) are exempted. Unauthenticated users are redirected to `/login`. Authenticated users on `/login` or `/` are redirected to `/home`.
4. **Logging Handler** -- Generates a request ID for API routes, logs response status and duration, and records warnings for 4xx responses and errors for exceptions.

---

## Project Structure

```
src/
  app.css                          Root CSS variables and design tokens
  app.html                         HTML shell
  hooks.server.ts                  Server middleware chain
  lib/
    client/                        Typed client SDK for all API endpoints
    components/                    Svelte UI components
      modals/                      Modal components for each entity type
      views/                       Timeline view components (Log, Vertical)
    config/                        Configuration (modal fields, display fields, views, socket types)
    modals/                        Modal registry and type definitions
    server/
      auth/                        OAuth config, API key validation, authorization helpers
      database/                    Drizzle schema files (three-tier naming), seed script
      data/                        SQLite database and log files (runtime)
      export/                      HTML export rendering
      logging/                     Logger implementation
      mcp/                         MCP server setup, session management, tool definitions
      services/                    Service layer (CRUD, validation, broadcast)
      socket/                      Socket.IO server setup and presence handling
    stores/                        Svelte stores (cache, collaboration)
    types/                         Shared TypeScript types (request/response shapes)
    utils/                         Utility functions (field formatting)
  routes/
    api/                           REST API endpoints
    auth/                          Auth.js callback routes
    home/                          Dashboard and incident list pages
    incident/                      Incident detail workspace
    login/                         Login page
    settings/                      API key and lookup table management
drizzle/                           Migration files and snapshots
```

---

## Scripts Reference

| Script | Description |
|---|---|
| `npm run dev` | Start the development server with hot module replacement. |
| `npm run build` | Build the application for production. |
| `npm run preview` | Preview the production build locally. |
| `npm run check` | Run TypeScript and Svelte type checking. |
| `npm run check:watch` | Run type checking in watch mode. |
| `npm run db:push` | Push schema to database without generating migrations. |
| `npm run db:generate` | Generate migration files from schema changes. |
| `npm run db:migrate` | Apply pending migrations. |
| `npm run db:seed` | Seed lookup tables with default data. |
| `npm run db:studio` | Open Drizzle Studio for visual database management. |
