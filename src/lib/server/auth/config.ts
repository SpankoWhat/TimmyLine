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

/**
 * Auth.js Configuration
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

export const { handle, signIn, signOut } = SvelteKitAuth({
	adapter: DrizzleAdapter(db, {
		usersTable: authUsers,
		accountsTable: authAccounts,
		sessionsTable: authSessions,
		verificationTokensTable: authVerificationTokens
	}),
	providers: [
		Google({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			authorization: {
				params: {
					prompt: 'consent',
					access_type: 'offline',
					response_type: 'code'
				}
			}
		}),
		MicrosoftEntraID({
			clientId: process.env.MICROSOFT_ENTRA_ID_CLIENT_ID!,
			clientSecret: process.env.MICROSOFT_ENTRA_ID_CLIENT_SECRET!,
			issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
			authorization: {
				params: {
					scope: 'openid profile email User.Read'
				}
			}
		}),
		// GitHub provider (optional, for developer convenience)
		...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
			? [
					GitHub({
						clientId: process.env.GITHUB_CLIENT_ID,
						clientSecret: process.env.GITHUB_CLIENT_SECRET
					})
			  ]
			: [])
	],
	callbacks: {
		/**
		 * Called when a user signs in.
		 * Auto-create or link analyst record on first login.
		 */
		async signIn({ user, account, profile }) {
			if (!user.email) return false;

			try {
				// Check if analyst exists with this email
				const existingAnalyst = await db
					.select()
					.from(analysts)
					.where(eq(analysts.email, user.email))
					.limit(1);

				if (existingAnalyst.length === 0) {
					// Auto-create analyst on first login
					await db.insert(analysts).values({
						user_id: user.id,
						username: user.email.split('@')[0], // Use email prefix as username
						email: user.email,
						full_name: user.name || user.email.split('@')[0],
						role: 'analyst', // Default role
						active: true
					});
				} else if (!existingAnalyst[0].user_id) {
					// Link existing analyst to auth user
					await db
						.update(analysts)
						.set({ user_id: user.id })
						.where(eq(analysts.email, user.email));
				}

				return true;
			} catch (error) {
				console.error('Error linking analyst on sign-in:', error);
				return false;
			}
		},

		/**
		 * Attach analyst info to session object
		 */
		async session({ session, user }) {
			if (session?.user) {
				// Fetch analyst info
				const analyst = await db
					.select()
					.from(analysts)
					.where(eq(analysts.user_id, user.id))
					.limit(1);

				if (analyst.length > 0) {
					session.user.analystUUID = analyst[0].uuid;
					session.user.analystRole = analyst[0].role;
					session.user.analystUsername = analyst[0].username;
				}
			}
			return session;
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
	}
});
