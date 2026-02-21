<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import '$lib/../app.css';

	let isLoading = $state(false);

	async function handleProviderLogin(provider: 'google' | 'azure-ad' | 'github') {
		isLoading = true;
		try {
			await signIn(provider, { redirectTo: '/home' });
		} catch (error) {
			console.error('Login error:', error);
			isLoading = false;
		}
	}
</script>

<div class="login-container">
	<div class="login-card">
		<div class="login-logo">
			<img src="/favicon.svg" alt="TimmyLine Logo" class="landing-logo" />
			<span class="login-brand">TimmyLine</span>
		</div>

		<p class="login-description">Incident Response Timeline</p>
		<p class="login-instruction">Sign in to continue</p>

		<div class="provider-buttons">
			<button
				class="provider-btn"
				onclick={() => handleProviderLogin('azure-ad')}
				disabled={isLoading}
			>
				Continue with Microsoft
			</button>

			<button
				class="provider-btn"
				onclick={() => handleProviderLogin('google')}
				disabled={isLoading}
			>
				Continue with Google
			</button>

			<button
				class="provider-btn"
				onclick={() => handleProviderLogin('github')}
				disabled={isLoading}
			>
				Continue with GitHub
			</button>
		</div>

		{#if isLoading}
			<div class="loading-indicator">Redirecting...</div>
		{/if}
	</div>
</div>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		background: hsl(var(--bg-root));
	}

	.login-card {
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-xl);
		padding: var(--space-8);
		width: 380px;
		text-align: center;
		box-shadow: var(--shadow-lg);
	}

	.login-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-3);
		margin-bottom: var(--space-6);
	}

	.login-brand {
		font-size: var(--text-2xl);
		font-weight: var(--font-bold);
		color: hsl(var(--fg-default));
		line-height: var(--leading-tight);
	}

	.login-description {
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
		margin: 0 0 var(--space-1) 0;
	}

	.login-instruction {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		margin: 0 0 var(--space-6) 0;
	}

	.provider-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.provider-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 40px;
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-surface-200));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-default));
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.provider-btn:hover:not(:disabled) {
		background: hsl(var(--bg-surface-300));
		border-color: hsl(var(--border-strong));
	}

	.provider-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.provider-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		margin-top: var(--space-4);
	}
</style>
