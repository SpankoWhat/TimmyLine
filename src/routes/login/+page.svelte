<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import "$lib/../app.css";

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
		<div class="login-header">
			<h1 class="title">TimmyLine</h1>
			<div class="divider"></div>
		</div>

		<div class="login-body">
			<p class="instruction">Authenticate to continue</p>

			<div class="provider-buttons">
				<button
					class="provider-btn microsoft"
					onclick={() => handleProviderLogin('azure-ad')}
					disabled={isLoading}
				>
					<span>Continue with Microsoft</span>
				</button>

				<button
					class="provider-btn google"
					onclick={() => handleProviderLogin('google')}
					disabled={isLoading}
				>
					<span>Continue with Google</span>
				</button>

				<button
					class="provider-btn github"
					onclick={() => handleProviderLogin('github')}
					disabled={isLoading}
				>
					<span>Continue with GitHub</span>
				</button>
			</div>

			{#if isLoading}
				<div class="loading-indicator">
					<span class="spinner">⟳</span>
					<span>Redirecting...</span>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		background-color: var(--color-bg-primary);
	}

	.h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		color: var(--color-text-primary);
	}

	.p {
		color: var(--color-text-secondary);
		margin-bottom: 1.5rem;
	}

	.login-card {
		background: var(--color-bg-secondary);
		padding: 2rem;
		border-radius: var(--border-radius-sm);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		width: 320px;
		text-align: center;
	}
	.provider-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}
</style>
