# TimmyLine

**TimmyLine** is a cybersecurity incident response timeline visualization and management tool built with SvelteKit, Drizzle ORM, and SQLite. It provides a terminal-aesthetic UI for tracking incidents, timeline events, investigation actions, entities, and annotations in incident response workflows.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+ recommended)
- **npm**, **pnpm**, or **yarn**
- **Windows PowerShell** (or compatible terminal)
- Native build tools for `better-sqlite3` (usually installed automatically)

### 1. Clone & Install

```powershell
# Navigate to project directory
cd C:\Users\urusername\Documents\_Projects\TimmyLine

# Install dependencies
npm install
```

### 2. Configure Environment

Set the `DATABASE_URL` environment variable to point to your SQLite database file:

```powershell
# PowerShell (Windows)
$env:DATABASE_URL = 'C:\Users\urusername\Documents\_Projects\TimmyLine\data\timmyD.sqlite'
```

> **Note:** The database file will be created automatically if it doesn't exist. The default fallback path (if `DATABASE_URL` is not set) is `C:/Users/urusername/Documents/_Projects/TimmyLine/data/timmyD.sqlite`.

### 3. Initialize Database Schema

Push the database schema to SQLite:

```powershell
npm run db:push
```

### 4. Seed Initial Data (Optional)

Populate the database with lookup tables and sample data:

```powershell
npm run db:seed
```

### 5. Start Development Server

```powershell
npm run dev
```

The application will be available at **http://localhost:5173** (or the port shown in terminal).

---

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run Svelte type checking |
| `npm run check:watch` | Run type checking in watch mode |
| `npm run db:push` | Push schema changes to database (no migrations) |
| `npm run db:generate` | Generate migration files from schema |
| `npm run db:migrate` | Apply migrations to database |
| `npm run db:studio` | Open Drizzle Studio (visual DB manager) |
| `npm run db:seed` | Seed database with initial lookup data |

---

## 🗂️ Project Structure

```
TimmyLine/
├── src/
│   ├── lib/
│   │   ├── assets/                    # Static assets (images, icons)
│   │   ├── components/                # Reusable Svelte components
│   │   │   ├── FloatingQuickActions.svelte  # Quick action buttons
│   │   │   ├── GenericModal.svelte          # Universal CRUD modal
│   │   │   └── TimelineRow.svelte           # Timeline event row
│   │   ├── config/
│   │   │   └── modalFields.ts         # Modal field configurations for entities
│   │   ├── stores/
│   │   │   ├── cacheStore.ts          # Global state management (incidents, analysts, etc.)
│   │   │   └── modalStore.ts          # Modal state and actions
│   │   └── server/
│   │       ├── index.ts               # DB client initialization (better-sqlite3 + Drizzle)
│   │       └── database/              # Database schema (modular by category)
│   │           ├── index.ts           # Exports all schemas
│   │           ├── seed.ts            # Database seeding script
│   │           ├── 01_XX_lookup_*.ts  # Lookup tables (event types, action types, etc.)
│   │           ├── 02_XX_core_*.ts    # Core tables (incidents, events, actions, etc.)
│   │           └── 03_XX_junction_*.ts # Many-to-many junction tables
│   └── routes/
│       ├── +layout.svelte             # Root layout (includes modal system)
│       ├── +page.svelte               # Dashboard/home page
│       ├── +page.server.ts            # Server-side data loading for home
│       ├── api/                       # RESTful API endpoints
│       │   ├── create/core/           # POST endpoints for creating entities
│       │   ├── read/core/             # GET endpoints for fetching entities
│       │   ├── update/                # PUT/PATCH endpoints (future)
│       │   ├── delete/                # DELETE endpoints (future)
│       │   └── health/                # Health check endpoint
│       └── incident/[incident]/       # Dynamic incident detail pages
│           ├── +page.svelte
│           └── +page.server.ts
├── drizzle/                           # Drizzle migrations & snapshots
├── data/                              # SQLite database files (.gitignored)
├── static/                            # Public static files
├── drizzle.config.ts                  # Drizzle Kit configuration
├── svelte.config.js                   # SvelteKit configuration
├── vite.config.ts                     # Vite configuration
├── tsconfig.json                      # TypeScript configuration
└── package.json                       # Dependencies and scripts
```

---

## 🏗️ Architecture Overview

### Technology Stack

- **Frontend:** SvelteKit 2 (Svelte 5) with TypeScript
- **Styling:** Tailwind CSS v4 (with `@tailwindcss/forms`)
- **Database:** SQLite via `better-sqlite3`
- **ORM:** Drizzle ORM (SQLite dialect)
- **Build Tool:** Vite 7

### Database Schema

The database is organized into **three tiers**:

#### 1. **Lookup Tables** (`01_XX_lookup_*.ts`)
Static reference data for dropdowns and categorization:
- `lookup_event_types` - Timeline event categories (e.g., file_created, network_connection)
- `lookup_action_types` - Investigation action types (e.g., containment, analysis)
- `lookup_relation_types` - Entity relationship types (e.g., child_of, depends_on)
- `lookup_annotation_types` - Annotation categories (e.g., note, hypothesis)
- `lookup_entity_types` - Entity types (e.g., ip_address, domain, file_hash)

#### 2. **Core Tables** (`02_XX_core_*.ts`)
Main application entities:
- `analysts` - User/analyst profiles
- `incidents` - Main incident records with SOAR ticket integration
- `timeline_events` - Timeline events linked to incidents
- `investigation_actions` - Investigation steps and responses
- `annotations` - Notes, hypotheses, and observations
- `entities` - IOCs and entities (IPs, domains, hashes, etc.)

#### 3. **Junction Tables** (`03_XX_junction_*.ts`)
Many-to-many relationships:
- `junction_action_events` - Links actions to timeline events
- `junction_event_entities` - Links events to entities
- `junction_action_entities` - Links actions to entities
- `junction_annotation_references` - Links annotations to any core entity

### Server-Only Code

> ⚠️ **Important:** The database client and schema are **server-only**. They live in `src/lib/server/` and must **never** be imported into client-side components or code that runs in the browser.

- **DB Client:** `src/lib/server/index.ts` initializes the `better-sqlite3` client and exports `db`.
- **Server Routes:** API endpoints (`src/routes/api/`) handle all database interactions.
- **Load Functions:** Use `+page.server.ts` files to fetch data server-side before rendering.

### Component System

#### Generic Modal System
A universal CRUD modal (`GenericModal.svelte`) handles all entity types:
- **Config-driven:** Field definitions in `src/lib/config/modalFields.ts`
- **Automatic validation:** Built-in required/custom validators
- **Dynamic dropdowns:** Auto-populated from stores (event types, action types, etc.)
- **Epoch time handling:** Automatic conversion for datetime fields
- **Terminal aesthetic:** Matches project design language

See [`MODAL_SYSTEM_GUIDE.md`](./MODAL_SYSTEM_GUIDE.md) for detailed usage.

#### State Management
- **`cacheStore.ts`:** Global Svelte stores for incidents, analysts, lookup tables, and selected state
- **`modalStore.ts`:** Modal open/close state and submit handlers

---

## 🛠️ Development Workflow

### Modifying the Database Schema

1. **Edit schema files** in `src/lib/server/database/`
2. **Push changes** (for dev, no migrations):
   ```powershell
   npm run db:push
   ```
3. **Or generate migrations** (for production):
   ```powershell
   npm run db:generate
   npm run db:migrate
   ```

### Adding a New Entity Type

1. Create schema file in `src/lib/server/database/02_XX_core_your_entity.ts`
2. Export it in `src/lib/server/database/index.ts`
3. Add field config in `src/lib/config/modalFields.ts`
4. Create API endpoints in `src/routes/api/create/core/your_entity/+server.ts`
5. Add read endpoint in `src/routes/api/read/core/your_entities/+server.ts`
6. Update `cacheStore.ts` if needed for global state

### Database Inspection

Use **Drizzle Studio** for visual database management:

```powershell
npm run db:studio
```

Opens a web UI (usually at `https://local.drizzle.studio`) for browsing and editing data.

---

## 🐛 Troubleshooting

### `DATABASE_URL is not set`
- Ensure you set `$env:DATABASE_URL` in PowerShell before running commands
- Or rely on the fallback path hardcoded in `src/lib/server/index.ts`

### `better-sqlite3` Installation Issues
- Ensure you have Visual Studio Build Tools or similar for native module compilation
- Try running `npm rebuild better-sqlite3`

### Import Errors (Client vs Server)
- **Never import** `$lib/server/*` into client-side code
- Use API routes or server load functions to bridge the gap

### Type Errors in Svelte 5
- Run `npm run check` to see TypeScript/Svelte diagnostics
- Svelte 5 uses runes (`$state`, `$derived`, `$props`) instead of stores in components

---

## 📚 Additional Documentation

- **[MODAL_SYSTEM_GUIDE.md](./MODAL_SYSTEM_GUIDE.md)** - Detailed guide for using the generic modal system
- **[DatabaseERD.drawio](./DatabaseERD.drawio)** - Entity-relationship diagram (open with draw.io)

---

## 🚢 Building for Production

```powershell
# Build optimized bundle
npm run build

# Preview production build locally
npm run preview
```

> **Deployment:** You may need to install a [SvelteKit adapter](https://svelte.dev/docs/kit/adapters) for your target environment (Node, Vercel, Netlify, etc.). The default is `@sveltejs/adapter-auto`.

---

## 📄 License

This project is private and proprietary. All rights reserved.
