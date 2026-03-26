<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import '$lib/../app.css';

	let { data } = $props();
	let isLoading = $state(false);

	const providers = $derived(data.enabledProviders);
	const hasAnyProvider = $derived(providers.google || providers.microsoft || providers.github);

	async function handleProviderLogin(provider: 'google' | 'microsoft-entra-id' | 'github') {
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

		{#if hasAnyProvider}
			<div class="provider-buttons">
				{#if providers.microsoft}
					<button
						class="provider-btn"
						onclick={() => handleProviderLogin('microsoft-entra-id')}
						disabled={isLoading}
					>
						Continue with Microsoft
					</button>
				{/if}

				{#if providers.google}
					<button
						class="provider-btn"
						onclick={() => handleProviderLogin('google')}
						disabled={isLoading}
					>
						Continue with Google
					</button>
				{/if}

				{#if providers.github}
					<button
						class="provider-btn"
						onclick={() => handleProviderLogin('github')}
						disabled={isLoading}
					>
						Continue with GitHub
					</button>
				{/if}
			</div>
		{:else}
			<div class="no-providers">
				<span class="no-providers-icon">&#9888;</span>
				<p class="no-providers-text">No authentication providers are currently enabled.</p>
				<p class="no-providers-hint">Contact your administrator.</p>
			</div>
		{/if}

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

	.no-providers {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-4) var(--space-3);
		background: hsl(var(--bg-surface-200));
		border: var(--border-width) solid hsl(var(--status-warning) / 0.3);
		border-radius: var(--radius-md);
	}

	.no-providers-icon {
		font-size: var(--text-xl);
		color: hsl(var(--status-warning));
		margin-bottom: var(--space-1);
	}

	.no-providers-text {
		font-size: var(--text-sm);
		color: hsl(var(--fg-default));
		margin: 0;
	}

	.no-providers-hint {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		margin: 0;
	}
</style>
