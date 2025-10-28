## Quick context

- Tech: SvelteKit (Vite) + TypeScript + Drizzle ORM + better-sqlite3 (SQLite).
- Project layout highlights: server-only code under `src/lib/server`, shared library code under `src/lib`, and routes under `routes/` (SvelteKit conventions).

## What an AI coding agent should know first

- Database: Drizzle is configured in `drizzle.config.ts` and uses the schema at `src/lib/server/db/schema.ts` (dialect: `sqlite`).
- The runtime DB client is initialized in `src/lib/server/db/index.ts`:

  - It reads the connection URL from `process.env.DATABASE_URL` via SvelteKit's `$env/dynamic/private` and creates a `better-sqlite3` client:
    - `const client = new Database(env.DATABASE_URL);`
    - `export const db = drizzle(client, { schema });`

- Important: the DB client is server-only. Do NOT import `src/lib/server/db` into client-side code or Svelte components that run in the browser—this will break the build or leak native modules into the client bundle.

## How to run & common commands (from `package.json`)

- Install deps: `npm install` (or `pnpm install` / `yarn` if you prefer).
- Dev server: `npm run dev` — starts Vite + SvelteKit.
- Build: `npm run build` and preview with `npm run preview`.
- Type check: `npm run check` (runs `svelte-check` with the repo tsconfig).

- Drizzle / DB tasks (wrapped by npm scripts):
  - `npm run db:push` — push schema (drizzle-kit)
  - `npm run db:generate` — generate types/migrations
  - `npm run db:migrate` — run migrations
  - `npm run db:studio` — open Drizzle Studio

Example: on Windows PowerShell set `DATABASE_URL` before running dev:

```powershell
$env:DATABASE_URL = 'C:\path\to\dev.sqlite'
npm run dev
```

## Project-specific patterns & conventions

- Source organization
  - `src/lib` is the shared library (importable as `$lib`).
  - `src/lib/server` holds server-only code (DB wiring, secrets access). Keep native/Node-only modules here.

- Environment
  - Secrets and the DB URL are read via SvelteKit's `$env/dynamic/private` in server modules. Expect `env.DATABASE_URL` to be present at import time for `src/lib/server/db/index.ts`.

- Drizzle schema patterns
  - `src/lib/server/db/schema.ts` uses `drizzle-orm/sqlite-core` constructs (e.g., `sqliteTable`, `text`, `integer`) and sets defaults like `crypto.randomUUID()` for `id` fields. Follow this style when adding tables.

## Integration & gotchas

- Avoid importing server-only modules into client-side files. If you need to expose data, create server endpoints (`+server.ts`) or use load functions on pages that run server-side.
- The DB client is created eagerly on import. Ensure `DATABASE_URL` exists before the app starts to prevent a thrown error (see `drizzle.config.ts` which also throws if `DATABASE_URL` is missing).
- `better-sqlite3` is a native dependency. If install/build issues occur on CI or Windows, ensure native toolchain or use prebuilt binaries; this repo relies on the package in `dependencies`.
- When producing inline code outputs/snippets, ensure is is placed in a markdown code block with the tag of "md".

## Files to inspect when troubleshooting or extending

- `drizzle.config.ts` — Drizzle CLI config (schema path, dialect, strict/verbose flags).
- `src/lib/server/db/index.ts` — DB client initialization and `export const db` used across server code.
- `src/lib/server/db/schema.ts` — current schema and examples for adding tables/columns.
- `package.json` — useful npm scripts (`dev`, `build`, `db:*`, `check`).
- `svelte.config.js` / `vite.config.ts` — SvelteKit + Vite setup; `$lib` alias and preprocessors live here.

## Example quick tasks an agent might be asked to do

- Add a new table: modify `src/lib/server/db/schema.ts`, then run `npm run db:generate` and `npm run db:migrate` or `npm run db:push` depending on desired workflow.
- Add a server API: create a `routes/your-route/+server.ts` endpoint that imports `db` from `src/lib/server/db` and exposes safe JSON responses.

## When you need clarification

- If a requested change interacts with client vs server boundaries, ask whether the feature should be server-only (endpoint) or client-visible (page load), because imports and bundling differ.