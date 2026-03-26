import { SvelteKitAuth } from '@auth/sveltekit';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Google from '@auth/sveltekit/providers/google';
import MicrosoftEntraID from '@auth/sveltekit/providers/microsoft-entra-id';
import GitHub from '@auth/sveltekit/providers/github';
import { db } from '$lib/server';
import {
	authUsers,
	authAccounts,
	authSessions,
	authVerificationTokens,
	analysts
} from '$lib/server/database';
import { eq } from 'drizzle-orm';
import { authLogger as logger } from '$lib/server/logging';
import { env } from '$env/dynamic/private';
import { getConfig } from '$lib/server/config';
import type { Provider } from '@auth/sveltekit/providers';

/**
 * Auth.js Configuration
 *
 * Provider toggles are read from `timmyline.config.json` at boot time.
 * Changing a provider toggle requires a server restart.
 *
 * Environment variables required:
 * - AUTH_SECRET: Random secret for session encryption (generate with `openssl rand -base64 32`)
 * - GOOGLE_CLIENT_ID: From Google Cloud Console OAuth 2.0 credentials
 * - GOOGLE_CLIENT_SECRET: From Google Cloud Console
 * - MICROSOFT_ENTRA_ID_CLIENT_ID: From Azure App Registration
 * - MICROSOFT_ENTRA_ID_CLIENT_SECRET: From Azure App Registration
 * - MICROSOFT_ENTRA_ID_TENANT_ID: Your Azure AD tenant ID
 * - GITHUB_CLIENT_ID: (Optional) From GitHub OAuth App
 * - GITHUB_CLIENT_SECRET: (Optional) From GitHub OAuth App
 * - AUTH_TRUST_HOST: Set to 'true' in production
 */

// ── Build providers list from config toggles ────────────────────────────
const config = getConfig();

const providers: Provider[] = [];

if (config.auth.google.enabled) {
	providers.push(
		Google({
			clientId: env.GOOGLE_CLIENT_ID,
			clientSecret: env.GOOGLE_CLIENT_SECRET,
			authorization: {
				params: {
					prompt: 'consent',
					access_type: 'offline',
					response_type: 'code'
				}
			}
		})
	);
	logger.info('Auth provider enabled: Google');
} else {
	logger.info('Auth provider disabled: Google');
}

if (config.auth.microsoft.enabled) {
	providers.push(
		MicrosoftEntraID({
			clientId: env.MICROSOFT_ENTRA_ID_CLIENT_ID,
			clientSecret: env.MICROSOFT_ENTRA_ID_CLIENT_SECRET,
			issuer: `https://login.microsoftonline.com/${env.MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
			authorization: {
				params: {
					scope: 'openid profile email User.Read'
				}
			}
		})
	);
	logger.info('Auth provider enabled: Microsoft Entra ID');
} else {
	logger.info('Auth provider disabled: Microsoft Entra ID');
}

if (config.auth.github.enabled) {
	providers.push(
		GitHub({
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET
		})
	);
	logger.info('Auth provider enabled: GitHub');
} else {
	logger.info('Auth provider disabled: GitHub');
}

if (providers.length === 0) {
	logger.warn('No OAuth providers are enabled — users will not be able to sign in!');
}

/** Which providers are enabled — exported so the login page can read it via +page.server.ts */
export const enabledProviders = {
	google: config.auth.google.enabled,
	microsoft: config.auth.microsoft.enabled,
	github: config.auth.github.enabled
} as const;

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(db, {
		usersTable: authUsers,
		accountsTable: authAccounts,
		sessionsTable: authSessions,
		verificationTokensTable: authVerificationTokens
	}),
	providers,
	callbacks: {
		/**
		 * Called when a user signs in.
		 * Just validate the email exists - analyst creation happens in session callback.
		 */
		async signIn({ user, account, profile }) {
			if (!user.email) return false;
			return true;
		},

		/**
		 * Attach analyst info to session object.
		 * Auto-create or link analyst record on first session creation.
		 */
		async session({ session, user }) {
			if (session?.user && user.email) {
				try {
				// Check if analyst exists with this email
					let analyst = await db
						.select()
						.from(analysts)
						.where(eq(analysts.email, user.email))
						.limit(1);

					if (analyst.length === 0) {
						// Auto-create analyst on first session
						const [newAnalyst] = await db.insert(analysts).values({
							user_id: user.id,
							username: user.email.split('@')[0], // Use email prefix as username
							email: user.email,
							full_name: user.name || user.email.split('@')[0],
							role: 'analyst', // Default role
							active: true
						}).returning();
						analyst = [newAnalyst];
						logger.debug('Created new analyst record', { email: user.email, uuid: newAnalyst.uuid });
					} else if (!analyst[0].user_id) {
						// Link existing analyst to auth user
						const [updatedAnalyst] = await db
							.update(analysts)
							.set({ user_id: user.id })
							.where(eq(analysts.email, user.email))
							.returning();
						analyst = [updatedAnalyst];
						logger.debug('Linked existing analyst to auth user', { email: user.email, uuid: updatedAnalyst.uuid });
					}

					// Attach analyst info to session
					if (analyst.length > 0) {
						session.user.id = user.id;
						session.user.analystUUID = analyst[0].uuid;
						session.user.analystRole = analyst[0].role;
						session.user.analystUsername = analyst[0].username;
					}
				} catch (er) {
					logger.error(`Error managing analyst in session callback.`, {
						err: er instanceof Error ? er.message : String(er),
						email: user.email
					});
				}
			}
			return session;
		}
	},
	logger: {
		error: (code, ...message) => {
			logger.error(`${code}`, { details: JSON.stringify(message) });
		},
		warn: (code, ...message) => {
			logger.warn(`${code}`, { details: JSON.stringify(message) });
		},
		debug: (code, ...message) => {
			// logger.debug(`${code}`, { details: JSON.stringify(message) });
		}
	},
	trustHost: true, // Required for production
	session: {
		strategy: 'database',
		maxAge: 30 * 24 * 60 * 60 // 30 days
	},
	pages: {
		signIn: '/login',
		error: '/login'
	},
	secret: env.AUTH_SECRET
});

if (!env.AUTH_SECRET) {
	logger.warn('WARNING: AUTH_SECRET is not set. This is insecure and should be fixed.');
}