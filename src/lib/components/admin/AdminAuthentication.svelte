<script lang="ts">
	interface Props {
		loading: boolean;
		getSettingValue: (key: string) => string;
		setSetting: (key: string, value: string) => void;
		setSettingBool: (key: string, checked: boolean) => void;
		isSettingTrue: (key: string) => boolean;
	}

	let { loading, getSettingValue, setSetting, setSettingBool, isSettingTrue }: Props = $props();
</script>

<section class="admin-section">
	<div class="section-header">
		<h2 class="section-title">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon" aria-hidden="true">
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
				<path d="M7 11V7a5 5 0 0110 0v4" />
			</svg>
			Authentication
		</h2>
	</div>

	{#if loading}
		<div class="loading-state">Loading…</div>
	{:else}
		<div class="settings-grid">
			<!-- OAuth Providers -->
			<div class="settings-card">
				<h3 class="card-title">OAuth Providers</h3>
				<p class="card-description">Enable or disable sign-in providers. Disabled providers will not appear on the login page. Requires app restart to take effect.</p>

				<div class="toggle-list">
					<label class="toggle-row">
						<div class="toggle-info">
							<span class="toggle-label">Google</span>
							<span class="toggle-hint">Sign in with Google Workspace / Gmail</span>
						</div>
						<input
							type="checkbox"
							class="toggle-input"
							checked={isSettingTrue('auth.google_enabled')}
							onchange={(e) => setSettingBool('auth.google_enabled', e.currentTarget.checked)}
						/>
					</label>

					<label class="toggle-row">
						<div class="toggle-info">
							<span class="toggle-label">Microsoft Entra ID</span>
							<span class="toggle-hint">Sign in with Azure AD / Microsoft 365</span>
						</div>
						<input
							type="checkbox"
							class="toggle-input"
							checked={isSettingTrue('auth.microsoft_enabled')}
							onchange={(e) => setSettingBool('auth.microsoft_enabled', e.currentTarget.checked)}
						/>
					</label>

					<label class="toggle-row">
						<div class="toggle-info">
							<span class="toggle-label">GitHub</span>
							<span class="toggle-hint">Sign in with GitHub account</span>
						</div>
						<input
							type="checkbox"
							class="toggle-input"
							checked={isSettingTrue('auth.github_enabled')}
							onchange={(e) => setSettingBool('auth.github_enabled', e.currentTarget.checked)}
						/>
					</label>
				</div>
			</div>

			<!-- API Key Authentication -->
			<div class="settings-card">
				<h3 class="card-title">Token-Based Authentication</h3>
				<p class="card-description">
					Control whether long-lived API keys (<code>tml_</code> tokens) are accepted for programmatic access.
					When disabled, external tools (MCP servers, scripts) must use OAuth 2.0 instead.
				</p>

				<div class="toggle-list">
					<label class="toggle-row">
						<div class="toggle-info">
							<span class="toggle-label">Allow API Key Authentication</span>
							<span class="toggle-hint">Accept Bearer tokens with <code>tml_</code> prefix</span>
						</div>
						<input
							type="checkbox"
							class="toggle-input"
							checked={isSettingTrue('auth.api_keys_enabled')}
							onchange={(e) => setSettingBool('auth.api_keys_enabled', e.currentTarget.checked)}
						/>
					</label>
				</div>

				{#if !isSettingTrue('auth.api_keys_enabled')}
					<div class="setting-warning">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
							<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<span>Disabling API keys will break any MCP servers or scripts using <code>tml_</code> tokens. They will need OAuth 2.0 credentials instead.</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>

<style>
	/* ===== Section Shell ===== */
	.admin-section {
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		background: hsl(var(--bg-surface-200));
	}
	.section-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
	}
	.section-icon {
		width: var(--icon-md);
		height: var(--icon-md);
		color: hsl(var(--fg-light));
		flex-shrink: 0;
	}

	/* ===== Settings Grid ===== */
	.settings-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		padding: var(--space-5);
	}
	.settings-card {
		background: hsl(var(--bg-surface-75));
		border: var(--border-width) solid hsl(var(--border-muted));
		border-radius: var(--radius-md);
		padding: var(--space-4);
	}
	.card-title {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		margin-bottom: var(--space-1);
	}
	.card-description {
		font-size: var(--text-xs);
		color: hsl(var(--fg-light));
		margin-bottom: var(--space-4);
		line-height: var(--leading-relaxed);
	}
	.card-description code {
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		color: hsl(var(--brand-link));
		background: hsl(var(--bg-surface-300));
		padding: 1px var(--space-1);
		border-radius: var(--radius-xs);
	}

	/* ===== Toggle Rows ===== */
	.toggle-list {
		display: flex;
		flex-direction: column;
	}
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2\.5) 0;
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		cursor: pointer;
	}
	.toggle-row:last-child {
		border-bottom: none;
	}
	.toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.toggle-label {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-default));
	}
	.toggle-hint {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}
	.toggle-hint code {
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		color: hsl(var(--brand-link));
	}

	/* Toggle switch */
	.toggle-input {
		appearance: none;
		width: 36px;
		height: 20px;
		background: hsl(var(--bg-surface-400));
		border-radius: var(--radius-full);
		position: relative;
		cursor: pointer;
		transition: background var(--duration-normal) var(--ease-default);
		flex-shrink: 0;
	}
	.toggle-input::before {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: hsl(var(--fg-lighter));
		border-radius: var(--radius-full);
		transition: transform var(--duration-normal) var(--ease-default), background var(--duration-normal) var(--ease-default);
	}
	.toggle-input:checked {
		background: hsl(var(--brand-default));
	}
	.toggle-input:checked::before {
		transform: translateX(16px);
		background: hsl(var(--fg-contrast));
	}
	.toggle-input:focus-visible {
		outline: 2px solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	/* ===== Warning Banner ===== */
	.setting-warning {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		margin-top: var(--space-3);
		padding: var(--space-2\.5) var(--space-3);
		background: hsl(var(--warning-200));
		border: var(--border-width) solid hsl(var(--warning-400));
		border-radius: var(--radius-sm);
		font-size: var(--text-xs);
		color: hsl(var(--warning-default));
		line-height: var(--leading-relaxed);
	}
	.setting-warning svg {
		flex-shrink: 0;
		margin-top: 1px;
	}
	.setting-warning code {
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
	}

	/* ===== Loading ===== */
	.loading-state {
		padding: var(--space-8) var(--space-5);
		text-align: center;
		font-size: var(--text-sm);
		color: hsl(var(--fg-muted));
	}
</style>
