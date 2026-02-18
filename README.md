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

### 2. Initialize Database Schema

Push the database schema to SQLite:

```powershell
npm run db:push
```

### 3. Start Development Server

```powershell
npm run dev
```

The application will be available at **http://localhost:5173** (or the port shown in terminal).

---

### 4. Link up mcp config
```json
    "timmyline": {
      "command": "npx",
      "args": [
        "tsx",
        "<<PATH TO PROJECT FILE>>\\TimmyLine\\src\\lib\\server\\mcp\\server.ts"
      ],
      "env": {
        "ORIGIN": "http://localhost:5173",
        "MCP_API_TOKEN": "<TOKEN U CREATED>"
      }
    }
``` 