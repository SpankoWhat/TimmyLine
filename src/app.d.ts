// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			logger?: import('./lib/server/logging/index').Logger;
			session?: import('@auth/sveltekit').Session | null;
			auth: () => Promise<import('@auth/sveltekit').Session | null>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module '@auth/sveltekit' {
	interface Session {
		user?: {
			name?: string | null;
			email?: string | null;
			image?: string | null;
			analystUUID?: string;
			analystRole?: string | null;
			analystUsername?: string;
		};
	}
}

export {};
