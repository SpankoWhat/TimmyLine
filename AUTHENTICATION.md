# Authentication Setup Guide

OAuth2 authentication has been integrated into TimmyLine using **Auth.js** (formerly NextAuth.js). This guide covers setup and configuration.

## Overview

- **Auth Provider**: Auth.js with Drizzle adapter
- **Session Storage**: SQLite database (server-side sessions)
- **Supported Providers**:
  - Microsoft Entra ID (Azure AD)
  - Google OAuth
  - GitHub (optional, for developers)
- **Session Duration**: 30 days
- **Auto-linking**: Users are automatically linked to analyst records on first login

---

## Initial Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Generate a random secret (required)
AUTH_SECRET=$(openssl rand -base64 32)

# Required for production
AUTH_TRUST_HOST=true

# OAuth Provider Credentials (see provider setup below)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

MICROSOFT_ENTRA_ID_CLIENT_ID=your_microsoft_client_id
MICROSOFT_ENTRA_ID_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_ENTRA_ID_TENANT_ID=your_tenant_id

# Optional
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

### 2. Database Migration

The auth schema has been applied. If starting fresh:

```powershell
# Set database path
$env:DATABASE_URL = 'C:\Users\username\Documents\_Projects\TimmyLine\data\timmyD.sqlite'

# Apply schema
npm run db:push

# Seed lookup tables
npm run db:seed
```

---

## OAuth Provider Setup

### Microsoft Entra ID (Azure AD)

1. Go to [Azure Portal](https://portal.azure.com/) → **Azure Active Directory** → **App registrations**
2. Click **New registration**:
   - **Name**: TimmyLine
   - **Supported account types**: Single tenant (or multitenant as needed)
   - **Redirect URI**: `http://localhost:5173/auth/callback` (development)
3. After creation:
   - Copy **Application (client) ID** → `MICROSOFT_ENTRA_ID_CLIENT_ID`
   - Copy **Directory (tenant) ID** → `MICROSOFT_ENTRA_ID_TENANT_ID`
4. Go to **Certificates & secrets** → **New client secret**:
   - Copy the secret value → `MICROSOFT_ENTRA_ID_CLIENT_SECRET`
5. Go to **API permissions** → **Add permission** → **Microsoft Graph**:
   - Add `User.Read`, `openid`, `profile`, `email`
6. **Production**: Update redirect URI to `https://yourdomain.com/auth/callback`

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**:
   - **Application type**: Web application
   - **Name**: TimmyLine
   - **Authorized JavaScript origins**: `http://localhost:5173`
   - **Authorized redirect URIs**: `http://localhost:5173/auth/callback`
5. After creation:
   - Copy **Client ID** → `GOOGLE_CLIENT_ID`
   - Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`
6. **Production**: Add production URLs to authorized origins and redirect URIs

### GitHub OAuth (Optional)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**:
   - **Application name**: TimmyLine
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/auth/callback`
3. After creation:
   - Copy **Client ID** → `GITHUB_CLIENT_ID`
   - Generate and copy **Client Secret** → `GITHUB_CLIENT_SECRET`

---

## How It Works

### Authentication Flow

1. User visits any protected route (e.g., `/incident/123`)
2. `hooks.server.ts` checks for valid session
3. If no session → redirect to `/login`
4. User clicks provider button (Google, Microsoft, GitHub)
5. OAuth flow completes → callback to `/auth/callback`
6. Auth.js creates session in `auth_sessions` table
7. `signIn` callback in `config.ts`:
   - Checks if analyst with email exists
   - If not, auto-creates analyst record
   - If exists without `user_id`, links to auth user
8. User redirected to original URL or home page

### Session Management

- **Server-side sessions** stored in SQLite (`auth_sessions` table)
- Session cookie name: `authjs.session-token`
- Sessions expire after 30 days of inactivity
- Session data enriched with analyst info in `session` callback

### Analyst Linking

When a user logs in for the first time:

```typescript
// Auto-create analyst if no match by email
if (!existingAnalyst) {
  await db.insert(analysts).values({
    user_id: user.id,
    username: user.email.split('@')[0],
    email: user.email,
    full_name: user.name || user.email.split('@')[0],
    role: 'analyst', // Default role
    active: true
  });
}
```

To pre-create analysts with specific roles, manually insert into `analysts` table with matching email before first login.

---

## Security Features

### Socket.IO Authentication

Real-time Socket.IO connections are authenticated via session validation:

```typescript
// Server validates session token from handshake cookies
globalForSocket.io.use(async (socket, next) => {
  const authInfo = await validateSocketSession(socket);
  if (!authInfo) {
    return next(new Error('Authentication failed'));
  }
  socket.data.analystUUID = authInfo.analystUUID;
  socket.data.analystName = authInfo.analystName;
  next();
});
```

Clients cannot spoof analyst identity—server validates session before accepting connections.

### Route Protection

Protected routes automatically redirect unauthenticated users:

```typescript
// hooks.server.ts
if (!session?.user && !isPublicRoute) {
  throw redirect(303, '/login');
}
```

**Public routes** (no auth required):
- `/login`
- `/auth/*` (OAuth callbacks)

**Protected routes** (require auth):
- `/` (home)
- `/incident/*`
- `/api/*` (API endpoints)

---

## Development Workflow

### Starting the Dev Server

```powershell
# Set database URL (or add to .env)
$env:DATABASE_URL = 'C:\Users\username\Documents\_Projects\TimmyLine\data\timmyD.sqlite'

# Start dev server
npm run dev
```

Visit `http://localhost:5173` → redirected to `/login` → choose OAuth provider.

### Testing Authentication

1. **First login**: Should auto-create analyst record
2. **Subsequent logins**: Should reuse existing analyst
3. **Check session**: Analyst name appears in header after login
4. **Socket.IO**: Open incident page, check browser console for connection logs
5. **Logout**: Not yet implemented—clear cookies manually or restart browser

### Common Issues

**"No OAuth credentials"**: Ensure all `_CLIENT_ID` and `_CLIENT_SECRET` env vars are set.

**"Invalid redirect URI"**: OAuth provider's allowed redirect URIs must match `http://localhost:5173/auth/callback`.

**"Session expired"**: Session lifetime is 30 days. Clear cookies or wait for auto-refresh.

**Socket.IO connection rejected**: Check browser cookies include `authjs.session-token`.

---

## Production Deployment

### Required Changes

1. **Generate new `AUTH_SECRET`**: Never reuse development secret
2. **Update OAuth redirect URIs**: Add production domain to all OAuth apps
3. **Set `AUTH_TRUST_HOST=true`** in production environment
4. **Use HTTPS**: Auth.js requires secure cookies in production
5. **Database backups**: Session data is critical—enable SQLite backups

### Environment Variables (Production)

```bash
AUTH_SECRET=<new_production_secret>
AUTH_TRUST_HOST=true
ORIGIN=https://yourdomain.com
DATABASE_URL=/path/to/production/database.sqlite

# Update OAuth credentials with production URLs
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MICROSOFT_ENTRA_ID_CLIENT_ID=...
MICROSOFT_ENTRA_ID_CLIENT_SECRET=...
MICROSOFT_ENTRA_ID_TENANT_ID=...
```

---

## Architecture Reference

### Database Schema

New tables:
- `auth_users`: OAuth user accounts
- `auth_accounts`: Provider-specific account details (can have multiple per user)
- `auth_sessions`: Active sessions
- `auth_verification_tokens`: Email verification tokens (future use)

Modified tables:
- `analysts`: Added `user_id` (FK to `auth_users.id`) and `email` columns

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/auth/config.ts` | Auth.js configuration, providers, callbacks |
| `src/hooks.server.ts` | Session validation, route protection |
| `src/app.d.ts` | TypeScript types for session data |
| `src/routes/+layout.server.ts` | Passes session to all pages |
| `src/routes/+layout.svelte` | Populates analyst store from session |
| `src/routes/login/+page.svelte` | Login UI with provider buttons |
| `src/routes/auth/signin/+server.ts` | OAuth sign-in handler |
| `src/routes/auth/callback/+server.ts` | OAuth callback handler |
| `src/routes/auth/signout/+server.ts` | Sign-out handler |
| `src/lib/server/socket/index.ts` | Socket.IO session validation |

### Session Data Structure

```typescript
session = {
  user: {
    email: 'analyst@example.com',
    name: 'John Doe',
    image: 'https://...',
    analystUUID: 'uuid-here',
    analystRole: 'analyst',
    analystUsername: 'jdoe'
  }
}
```

Available in:
- Server: `event.locals.session`
- Client: `data.session` (from `+layout.server.ts`)

---

## Future Enhancements

- [ ] **Sign-out button** in UI (currently manual cookie clearing)
- [ ] **Session refresh** mechanism for long-running sessions
- [ ] **Role-based access control** (RBAC) for analysts
- [ ] **Admin panel** for managing analyst-user links
- [ ] **Audit logging** for authentication events
- [ ] **Email verification** flow for new users
- [ ] **RADIUS/LDAP support** for on-premises Active Directory

---

## Troubleshooting

Run `npm run check` to validate TypeScript types and catch auth-related errors early.

For Auth.js debugging, enable verbose logging:
```typescript
// src/lib/server/auth/config.ts
export const { handle } = SvelteKitAuth({
  debug: true, // Add this line
  // ... rest of config
});
```

Check server console for detailed OAuth flow logs.
