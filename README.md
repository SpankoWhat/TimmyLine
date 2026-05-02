# TimmyLine

TimmyLine is a cybersecurity incident response timeline visualization and management tool. It is built with SvelteKit 2 (Svelte 5), Drizzle ORM, and SQLite, and provides a data-dense, terminal-aesthetic interface for tracking incidents, timeline events, investigation actions, entities, and annotations throughout incident response workflows. It supports real-time multi-analyst collaboration via Socket.IO, OAuth-based authentication, API key access, and a Model Context Protocol (MCP) server for AI agent integration.

---

## Quick Start

```powershell
git clone https://github.com/SpankoWhat/TimmyLine.git
cd TimmyLine
npm install

cp timmyline.config.example.json timmyline.config.json   # non-secret settings
```

Then choose one runtime credential source:

```powershell
# Option A: local env file template
cp example.env .env

# Option B: AWS Secrets Manager runtime injection
$env:TIMMYLINE_AWS_SECRET_ID = 'timmyline/auth'
$env:TIMMYLINE_AWS_SECRET_REGION = 'us-east-1'
node .\scripts\aws-secrets-env.mjs --format powershell | Invoke-Expression

npm run db:push    # create the SQLite database
npm run db:seed    # optional: populate lookup tables
npm run dev        # http://localhost:5173
```

See the [Quick Start guide](https://github.com/SpankoWhat/TimmyLine/wiki/Quick-Start) for detailed steps.

---

## Configuration

TimmyLine separates configuration into two layers:

| File | Purpose |
|---|---|
| `timmyline.config.json` | Non-secret settings: database path, logging, auth toggles, web server port/origin |
| Process environment | Runtime auth settings and secrets: `AUTH_SECRET`, OAuth client IDs/secrets |

TimmyLine reads credentials from environment variables at runtime. You can supply them with a local `.env`, your platform's secret injection, or the bundled AWS Secrets Manager helper without changing application code.

```json
{
  "logging":   { "filePath": "./data/timmyLine.log", "writeToFile": false },
  "database":  { "filePath": "./data/timmyLine.db" },
  "auth":      { "google": { "enabled": true }, "microsoft": { "enabled": true }, "github": { "enabled": true }, "apiKeys": { "enabled": true } },
  "webServer": { "port": 3000, "origin": "http://localhost" }
}
```

Full reference: [Configuration](https://github.com/SpankoWhat/TimmyLine/wiki/Configuration)

---

## Production Deployment

### Docker (Recommended)

```bash
cp timmyline.config.example.json timmyline.config.json
./init-db.sh
docker compose up -d
```

Credential source options:

- Direct environment variables, including `docker compose --env-file .env up -d`
- Runtime AWS Secrets Manager injection by exporting `TIMMYLINE_AWS_SECRET_ID` and a region (`TIMMYLINE_AWS_SECRET_REGION` or `AWS_REGION`) before `docker compose up -d`

When `TIMMYLINE_AWS_SECRET_ID` is set, the container entrypoint fetches the secret and injects the values into its shell environment before starting TimmyLine.

### Manual (Node.js 20+)

```bash
npm ci && npm run build
cp timmyline.config.example.json timmyline.config.json
node migrate.js
node server.js
```

For manual runtime injection, export the environment directly or load it from AWS before starting the server process.

## AWS Runtime Injection

The helper at `scripts/aws-secrets-env.mjs` fetches one Secrets Manager secret, expects a JSON object whose keys are environment variable names, and prints shell commands that export them.

Example secret payload:

```json
{
  "AUTH_SECRET": "...",
  "GOOGLE_CLIENT_ID": "...",
  "GOOGLE_CLIENT_SECRET": "...",
  "MICROSOFT_ENTRA_ID_CLIENT_ID": "...",
  "MICROSOFT_ENTRA_ID_CLIENT_SECRET": "...",
  "MICROSOFT_ENTRA_ID_TENANT_ID": "...",
  "MICROSOFT_ENTRA_ID_API_AUDIENCE": "...",
  "GITHUB_CLIENT_ID": "...",
  "GITHUB_CLIENT_SECRET": "..."
}
```

PowerShell:

```powershell
$env:TIMMYLINE_AWS_SECRET_ID = 'timmyline/auth'
$env:TIMMYLINE_AWS_SECRET_REGION = 'us-east-1'
node .\scripts\aws-secrets-env.mjs --format powershell | Invoke-Expression
npm run dev
```

POSIX shells:

```bash
export TIMMYLINE_AWS_SECRET_ID=timmyline/auth
export TIMMYLINE_AWS_SECRET_REGION=us-east-1
eval "$(node ./scripts/aws-secrets-env.mjs --format sh)"
npm run dev
```

The helper never writes a plaintext credential file. It only materializes the secret values in the current process environment at runtime.

Full guide: [Production Deployment](https://github.com/SpankoWhat/TimmyLine/wiki/Production-Deployment)

---

## Key Features

- **Incident Management** — Dashboard with priority/status statistics, sortable incident list.
- **Timeline Views** — Dense log view and vertical timeline with date separators, gap detection, and event clustering.
- **Entities & Annotations** — IOC/asset tracking and analyst notes in a floating, detachable side panel.
- **Relationship Management** — Link events, actions, and entities with typed roles via inline builders.
- **Real-Time Collaboration** — Socket.IO presence tracking, per-row focus/edit indicators, live data sync.
- **Export** — Self-contained interactive HTML export of any incident.
- **Command Palette** — `Ctrl+K` for navigation, creation, and configuration commands.
- **MCP Integration** — 37-tool Model Context Protocol server for AI agent access.

Full details: [Features](https://github.com/SpankoWhat/TimmyLine/wiki/Features)

---

## Documentation

| Topic | Link |
|---|---|
| Quick Start | [wiki/Quick-Start](https://github.com/SpankoWhat/TimmyLine/wiki/Quick-Start) |
| Configuration | [wiki/Configuration](https://github.com/SpankoWhat/TimmyLine/wiki/Configuration) |
| Production Deployment | [wiki/Production-Deployment](https://github.com/SpankoWhat/TimmyLine/wiki/Production-Deployment) |
| Features | [wiki/Features](https://github.com/SpankoWhat/TimmyLine/wiki/Features) |
| Authentication | [wiki/Authentication](https://github.com/SpankoWhat/TimmyLine/wiki/Authentication) |
| API Reference | [wiki/API-Reference](https://github.com/SpankoWhat/TimmyLine/wiki/API-Reference) |
| MCP Server Integration | [wiki/MCP-Server-Integration](https://github.com/SpankoWhat/TimmyLine/wiki/MCP-Server-Integration) |
| Architecture | [wiki/Architecture](https://github.com/SpankoWhat/TimmyLine/wiki/Architecture) |
| Project Structure | [wiki/Project-Structure](https://github.com/SpankoWhat/TimmyLine/wiki/Project-Structure) |

---

## License

See [LICENSE](LICENSE).
