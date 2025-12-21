<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';

	let isLoading = $state(false);

	async function handleProviderLogin(provider: 'google' | 'azure-ad' | 'github') {
		isLoading = true;
		try {
			await signIn(provider, { callbackUrl: '/' });
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
			<p class="subtitle">Incident Response Timeline Tool</p>
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
					<span class="provider-icon">🔷</span>
					<span>Continue with Microsoft</span>
				</button>

				<button
					class="provider-btn google"
					onclick={() => handleProviderLogin('google')}
					disabled={isLoading}
				>
					<span class="provider-icon">🔴</span>
					<span>Continue with Google</span>
				</button>

				<button
					class="provider-btn github"
					onclick={() => handleProviderLogin('github')}
					disabled={isLoading}
				>
					<span class="provider-icon">⚫</span>
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

		<div class="login-footer">
			<p class="footer-text">
				Authorized personnel only • Session expires in 30 days
			</p>
		</div>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #0a0a0a;
		font-family: 'Courier New', monospace;
		padding: 1rem;
	}

	.login-card {
		background: #1a1a1a;
		border: 2px solid #00ff00;
		border-radius: 4px;
		box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
		max-width: 450px;
		width: 100%;
	}

	.login-header {
		padding: 2rem 2rem 1.5rem;
		border-bottom: 1px solid #00ff00;
	}

	.title {
		color: #00ff00;
		font-size: 2.5rem;
		font-weight: bold;
		margin: 0;
		text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
		letter-spacing: 2px;
	}

	.subtitle {
		color: #00ff00;
		font-size: 0.9rem;
		margin: 0.5rem 0 0;
		opacity: 0.7;
	}

	.divider {
		height: 2px;
		background: linear-gradient(
			90deg,
			transparent,
			#00ff00,
			transparent
		);
		margin-top: 1rem;
	}

	.login-body {
		padding: 2rem;
	}

	.instruction {
		color: #00ff00;
		text-align: center;
		margin: 0 0 2rem;
		font-size: 1rem;
	}

	.provider-buttons {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.provider-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: #0a0a0a;
		border: 2px solid #00ff00;
		color: #00ff00;
		font-family: 'Courier New', monospace;
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 1px;
	}

	.provider-btn:hover:not(:disabled) {
		background: #00ff00;
		color: #0a0a0a;
		box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
		transform: translateY(-2px);
	}

	.provider-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.provider-icon {
		font-size: 1.5rem;
	}

	.loading-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
		color: #00ff00;
		font-size: 0.9rem;
	}

	.spinner {
		display: inline-block;
		animation: spin 1s linear infinite;
		font-size: 1.5rem;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.login-footer {
		padding: 1.5rem 2rem;
		border-top: 1px solid #00ff00;
		background: rgba(0, 255, 0, 0.05);
	}

	.footer-text {
		color: #00ff00;
		font-size: 0.75rem;
		text-align: center;
		margin: 0;
		opacity: 0.6;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
</style>
