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

### 4. Link up mcp config in vscode example
```json
    "timmyline": {
			"url": "http://localhost:5173/api/mcp",
			"headers": {
				"Authorization": "tml_036ffe5b5e37ae2ee093c3faa9a4ed168b4306733d266f2a86d97ce0bd98faaf"
			}
		}
``` 