<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/client';
	import type { AdminAnalyst, AppSettingsMap } from '$lib/client';

	// ── State ──
	let settings = $state<AppSettingsMap>({});
	let analysts = $state<AdminAnalyst[]>([]);
	let loadingSettings = $state(true);
	let loadingAnalysts = $state(true);
	let savingSettings = $state(false);
	let settingsError = $state('');
	let analystsError = $state('');
	let settingsSaved = $state(false);
	let restartRequired = $state(false);
	let editingAnalyst = $state<string | null>(null);
	let editRole = $state('');

	// Track pending changes for settings
	let pendingSettings = $state<Record<string, string>>({});
	let hasPendingChanges = $derived(Object.keys(pendingSettings).length > 0);

	// Keys that require a server restart to take effect
	const RESTART_KEYS = new Set([
		'auth.google_enabled', 'auth.microsoft_enabled', 'auth.github_enabled',
		'logging.file_path', 'logging.write_to_file'
	]);
	let pendingNeedsRestart = $derived(
		Object.keys(pendingSettings).some(k => RESTART_KEYS.has(k))
	);

	// ── Derived ──
	let activeAnalysts = $derived(analysts.filter(a => !a.deleted_at));
	let deletedAnalysts = $derived(analysts.filter(a => a.deleted_at));

	// Cursor throttle presets & stats
	const CURSOR_PRESETS = [
		{ ms: 5,   label: '5' },
		{ ms: 20,  label: '20' },
		{ ms: 50,  label: '50' },
		{ ms: 100, label: '100' }
	] as const;
	const CURSOR_MSG_BYTES = 210; // Socket.IO frame overhead + JSON payload estimate
	let cursorThrottleMs = $derived(parseInt(getSettingValue('collaboration.cursor_throttle_ms')) || 50);
	let cursorPresetIndex = $derived(CURSOR_PRESETS.findIndex(p => p.ms === cursorThrottleMs));
	let cursorFps = $derived(Math.round((1000 / Math.max(cursorThrottleMs, 1)) * 10) / 10);
	let cursorBwPerUser = $derived(cursorFps * CURSOR_MSG_BYTES);

	function formatBandwidth(bytesPerSec: number): string {
		if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
		return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
	}

	// ── Settings helpers ──
	function getSettingValue(key: string): string {
		return pendingSettings[key] ?? settings[key] ?? '';
	}

	function setSetting(key: string, value: string) {
		if (value === settings[key]) {
			// Revert — remove from pending
			const { [key]: _, ...rest } = pendingSettings;
			pendingSettings = rest;
		} else {
			pendingSettings = { ...pendingSettings, [key]: value };
		}
	}

	function setSettingBool(key: string, checked: boolean) {
		setSetting(key, checked ? 'true' : 'false');
	}

	function isSettingTrue(key: string): boolean {
		return getSettingValue(key) === 'true';
	}

	// ── Data fetching ──
	async function fetchSettings() {
		loadingSettings = true;
		settingsError = '';
		try {
			settings = await api.admin.settings.list();
			pendingSettings = {};
		} catch (err) {
			settingsError = (err as Error).message;
		} finally {
			loadingSettings = false;
		}
	}

	async function fetchAnalysts() {
		loadingAnalysts = true;
		analystsError = '';
		try {
			analysts = await api.admin.analysts.list();
		} catch (err) {
			analystsError = (err as Error).message;
		} finally {
			loadingAnalysts = false;
		}
	}

	async function saveSettings() {
		if (!hasPendingChanges) return;
		savingSettings = true;
		settingsError = '';
		settingsSaved = false;
		try {
			const needsRestart = pendingNeedsRestart;
			settings = await api.admin.settings.update(pendingSettings);
			pendingSettings = {};
			settingsSaved = true;
			restartRequired = needsRestart;
			setTimeout(() => { settingsSaved = false; restartRequired = false; }, needsRestart ? 8000 : 3000);
		} catch (err) {
			settingsError = (err as Error).message;
		} finally {
			savingSettings = false;
		}
	}

	function startEditRole(analyst: AdminAnalyst) {
		editingAnalyst = analyst.uuid;
		editRole = analyst.role ?? 'reader';
	}

	function cancelEditRole() {
		editingAnalyst = null;
		editRole = '';
	}

	async function saveRole(uuid: string) {
		analystsError = '';
		try {
			const updated = await api.admin.analysts.update(uuid, { role: editRole });
			analysts = analysts.map(a => (a.uuid === uuid ? { ...a, ...updated } : a));
			editingAnalyst = null;
		} catch (err) {
			analystsError = (err as Error).message;
		}
	}

	async function toggleActive(analyst: AdminAnalyst) {
		analystsError = '';
		try {
			const updated = await api.admin.analysts.update(analyst.uuid, { active: !analyst.active });
			analysts = analysts.map(a => (a.uuid === analyst.uuid ? { ...a, ...updated } : a));
		} catch (err) {
			analystsError = (err as Error).message;
		}
	}

	function formatTimestamp(epoch: number | null): string {
		if (!epoch) return '—';
		const date = new Date(epoch * 1000);
		return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
	}

	onMount(() => {
		document.title = 'Admin — TimmyLine';
		fetchSettings();
		fetchAnalysts();
	});
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="page-title-icon" aria-hidden="true">
			<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
		</svg>
		Administration
	</h1>
	<p class="page-subtitle">Manage users, authentication providers, and application settings. Configuration is stored in <code>timmyline.config.json</code>.</p>
</header>

<div class="page-content">

	<!-- ════════════════════════════════════════════════════════════════════
	     SECTION 1: User Management
	     ════════════════════════════════════════════════════════════════════ -->
	<section class="admin-section">
		<div class="section-header">
			<h2 class="section-title">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon" aria-hidden="true">
					<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<path d="M23 21v-2a4 4 0 00-3-3.87" />
					<path d="M16 3.13a4 4 0 010 7.75" />
				</svg>
				User Management
			</h2>
			<span class="section-badge">{activeAnalysts.length} active</span>
		</div>

		{#if analystsError}
			<div class="error-banner" role="alert">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
					<circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
				</svg>
				{analystsError}
			</div>
		{/if}

		{#if loadingAnalysts}
			<div class="loading-state">Loading analysts…</div>
		{:else}
			<div class="table-wrapper">
				<table class="admin-table">
					<thead>
						<tr>
							<th>Username</th>
							<th>Full Name</th>
							<th>Email</th>
							<th>Role</th>
							<th>Status</th>
							<th>Created</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each activeAnalysts as analyst (analyst.uuid)}
							<tr>
								<td class="cell-username mono">{analyst.username}</td>
								<td class="cell-name">{analyst.full_name ?? '—'}</td>
								<td class="cell-email mono">{analyst.email ?? '—'}</td>
								<td class="cell-role">
									{#if editingAnalyst === analyst.uuid}
										<div class="inline-edit">
											<select class="inline-select" bind:value={editRole}>
												<option value="reader">Reader</option>
												<option value="analyst">Analyst</option>
												<option value="admin">Admin</option>
											</select>
											<button class="btn-icon btn-confirm" onclick={() => saveRole(analyst.uuid)} title="Save">
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
											</button>
											<button class="btn-icon btn-cancel" onclick={cancelEditRole} title="Cancel">
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
											</button>
										</div>
									{:else}
										<button class="role-badge role-{analyst.role ?? 'reader'}" onclick={() => startEditRole(analyst)} title="Click to edit role">
											{analyst.role ?? 'reader'}
										</button>
									{/if}
								</td>
								<td class="cell-status">
									<span class="status-dot" class:status-active={analyst.active} class:status-inactive={!analyst.active}></span>
									{analyst.active ? 'Active' : 'Inactive'}
								</td>
								<td class="cell-date mono">{formatTimestamp(analyst.created_at)}</td>
								<td class="cell-actions">
									<button
										class="btn-text"
										class:btn-deactivate={analyst.active}
										class:btn-activate={!analyst.active}
										onclick={() => toggleActive(analyst)}
									>
										{analyst.active ? 'Deactivate' : 'Activate'}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if deletedAnalysts.length > 0}
				<details class="deleted-section">
					<summary class="deleted-summary">Deleted analysts ({deletedAnalysts.length})</summary>
					<div class="table-wrapper">
						<table class="admin-table muted">
							<thead>
								<tr>
									<th>Username</th>
									<th>Full Name</th>
									<th>Role</th>
									<th>Deleted</th>
								</tr>
							</thead>
							<tbody>
								{#each deletedAnalysts as analyst (analyst.uuid)}
									<tr>
										<td class="cell-username mono">{analyst.username}</td>
										<td class="cell-name">{analyst.full_name ?? '—'}</td>
										<td><span class="role-badge role-inactive">{analyst.role ?? '—'}</span></td>
										<td class="cell-date mono">{formatTimestamp(analyst.deleted_at)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</details>
			{/if}
		{/if}
	</section>

	<!-- ════════════════════════════════════════════════════════════════════
	     SECTION 2: Authentication
	     ════════════════════════════════════════════════════════════════════ -->
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

		{#if loadingSettings}
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

	<!-- ════════════════════════════════════════════════════════════════════
	     SECTION 3: Logging Configuration
	     ════════════════════════════════════════════════════════════════════ -->
	<section class="admin-section">
		<div class="section-header">
			<h2 class="section-title">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon" aria-hidden="true">
					<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="16" y1="13" x2="8" y2="13" />
					<line x1="16" y1="17" x2="8" y2="17" />
					<polyline points="10 9 9 9 8 9" />
				</svg>
				Logging
			</h2>
		</div>

		{#if loadingSettings}
			<div class="loading-state">Loading…</div>
		{:else}
			<div class="settings-grid">
				<div class="settings-card">
					<h3 class="card-title">File Logging</h3>
					<p class="card-description">Configure whether logs are written to a file and where. Changes require an app restart.</p>

					<div class="toggle-list">
						<label class="toggle-row">
							<div class="toggle-info">
								<span class="toggle-label">Write Logs to File</span>
								<span class="toggle-hint">When enabled, logs are written to the file path below instead of stdout</span>
							</div>
							<input
								type="checkbox"
								class="toggle-input"
								checked={isSettingTrue('logging.write_to_file')}
								onchange={(e) => setSettingBool('logging.write_to_file', e.currentTarget.checked)}
							/>
						</label>
					</div>

					<div class="field-group">
						<label class="field-label" for="log-path">Log File Path</label>
						<input
							id="log-path"
							type="text"
							class="field-input mono"
							value={getSettingValue('logging.file_path')}
							oninput={(e) => setSetting('logging.file_path', e.currentTarget.value)}
							placeholder="./data/timmyLine.log"
							disabled={!isSettingTrue('logging.write_to_file')}
						/>
						<span class="field-hint">Relative to project root or absolute path</span>
					</div>
				</div>
			</div>
		{/if}
	</section>

	<!-- ════════════════════════════════════════════════════════════════════
	     SECTION 4: Collaboration
	     ════════════════════════════════════════════════════════════════════ -->
	<section class="admin-section">
		<div class="section-header">
			<h2 class="section-title">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon" aria-hidden="true">
					<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<path d="M23 21v-2a4 4 0 00-3-3.87" />
					<path d="M16 3.13a4 4 0 010 7.75" />
				</svg>
				Collaboration
			</h2>
		</div>

		{#if loadingSettings}
			<div class="loading-state">Loading…</div>
		{:else}
			<div class="settings-grid">
				<div class="settings-card">
					<h3 class="card-title">Shared Cursors</h3>
					<p class="card-description">Control how frequently cursor positions are broadcast between analysts viewing the same incident. Lower values feel smoother but use more bandwidth.</p>

					<div class="cursor-rate-row">
						<!-- Step toggle track -->
						<div class="step-track" role="radiogroup" aria-label="Cursor broadcast interval">
							<div class="step-rail"></div>
							{#each CURSOR_PRESETS as preset, i}
								<button
									class="step-stop"
									class:active={cursorPresetIndex === i}
									role="radio"
									aria-checked={cursorPresetIndex === i}
									aria-label="{preset.ms} milliseconds"
									onclick={() => setSetting('collaboration.cursor_throttle_ms', String(preset.ms))}
								>
									<span class="stop-dot"></span>
									<span class="stop-label">{preset.label}<span class="stop-unit">ms</span></span>
								</button>
							{/each}
						</div>

						<!-- Stats -->
						<div class="cursor-stats">
							<div class="stat-cell">
								<span class="stat-label">Rate</span>
								<span class="stat-value">{cursorFps} <span class="stat-unit">fps</span></span>
							</div>
							<div class="stat-cell">
								<span class="stat-label">User Out</span>
								<span class="stat-value">{formatBandwidth(cursorBwPerUser)}</span>
							</div>
							<div class="stat-cell">
								<span class="stat-label">6 Users</span>
								<span class="stat-value">{formatBandwidth(cursorBwPerUser * 6 * 5)}</span>
							</div>
						</div>
					</div>
					<span class="field-hint">Takes effect on next socket connection.</span>
				</div>
			</div>
		{/if}
	</section>

	<!-- ════════════════════════════════════════════════════════════════════
	     SAVE BAR (sticky bottom)
	     ════════════════════════════════════════════════════════════════════ -->
	{#if hasPendingChanges || settingsSaved}
		<div class="save-bar" class:saved={settingsSaved}>
			{#if settingsSaved}
				<span class="save-message">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
					Settings saved to config file
				</span>
				{#if restartRequired}
					<span class="restart-notice">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
							<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						Server restart required for some changes to take effect
					</span>
				{/if}
			{:else}
				<span class="save-message">
					{Object.keys(pendingSettings).length} unsaved change{Object.keys(pendingSettings).length === 1 ? '' : 's'}
					{#if pendingNeedsRestart}
						<span class="restart-hint">· restart required</span>
					{/if}
				</span>
				<div class="save-actions">
					<button class="btn-secondary" onclick={() => { pendingSettings = {}; }}>Discard</button>
					<button class="btn-primary" onclick={saveSettings} disabled={savingSettings}>
						{savingSettings ? 'Saving…' : 'Save Changes'}
					</button>
				</div>
			{/if}
		</div>
	{/if}

	{#if settingsError}
		<div class="error-banner" role="alert">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
				<circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
			</svg>
			{settingsError}
		</div>
	{/if}
</div>

<style>
	/* ===== Page Layout ===== */
	.page-header {
		padding: var(--space-6) var(--space-6) var(--space-4);
		border-bottom: var(--border-width) solid hsl(var(--border-default));
		background: hsl(var(--bg-surface-100));
	}
	.page-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
	}
	.page-title-icon {
		width: var(--icon-lg);
		height: var(--icon-lg);
		color: hsl(var(--brand-default));
		flex-shrink: 0;
	}
	.page-subtitle {
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
	}
	.page-content {
		padding: var(--space-6);
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		max-width: 960px;
	}

	/* ===== Sections ===== */
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
	.section-badge {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		background: hsl(var(--bg-surface-300));
		padding: var(--space-0\.5) var(--space-2);
		border-radius: var(--radius-sm);
	}

	/* ===== Table ===== */
	.table-wrapper {
		overflow-x: auto;
	}
	.admin-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	.admin-table thead th {
		padding: var(--space-2) var(--space-3);
		text-align: left;
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-lighter));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		background: hsl(var(--bg-surface-200));
		border-bottom: var(--border-width) solid hsl(var(--border-default));
	}
	.admin-table tbody td {
		padding: var(--space-2) var(--space-3);
		color: hsl(var(--fg-default));
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		vertical-align: middle;
	}
	.admin-table tbody tr:hover {
		background: hsl(var(--bg-surface-200));
	}
	.admin-table.muted tbody td {
		color: hsl(var(--fg-muted));
	}
	.cell-username {
		font-weight: var(--font-medium);
	}
	.cell-email, .cell-date {
		color: hsl(var(--fg-light));
		font-size: var(--text-xs);
	}
	.cell-actions {
		text-align: right;
	}

	/* ===== Role Badges ===== */
	.role-badge {
		display: inline-flex;
		align-items: center;
		padding: var(--space-0\.5) var(--space-1\.5);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		border-radius: var(--radius-sm);
		text-transform: capitalize;
		border: none;
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.role-reader {
		color: hsl(var(--info-default));
		background: hsl(var(--info-200));
	}
	.role-reader:hover {
		background: hsl(var(--info-500));
	}
	.role-analyst {
		color: hsl(var(--success-default));
		background: hsl(var(--success-200));
	}
	.role-analyst:hover {
		background: hsl(var(--success-500));
	}
	.role-admin {
		color: hsl(var(--warning-default));
		background: hsl(var(--warning-200));
	}
	.role-admin:hover {
		background: hsl(var(--warning-500));
	}
	.role-inactive {
		color: hsl(var(--fg-muted));
		background: hsl(var(--bg-muted));
		cursor: default;
	}

	/* ===== Status Dot ===== */
	.cell-status {
		display: flex;
		align-items: center;
		gap: var(--space-1\.5);
		font-size: var(--text-sm);
	}
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}
	.status-active {
		background: hsl(var(--success-default));
	}
	.status-inactive {
		background: hsl(var(--fg-muted));
	}

	/* ===== Inline Edit ===== */
	.inline-edit {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}
	.inline-select {
		padding: var(--space-0\.5) var(--space-1\.5);
		font-size: var(--text-xs);
		background: hsl(var(--bg-control));
		color: hsl(var(--fg-default));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-sm);
		font-family: inherit;
	}
	.inline-select:focus {
		outline: none;
		border-color: hsl(var(--border-focus));
	}
	.btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
		background: transparent;
	}
	.btn-confirm {
		color: hsl(var(--success-default));
	}
	.btn-confirm:hover {
		background: hsl(var(--success-200));
	}
	.btn-cancel {
		color: hsl(var(--fg-muted));
	}
	.btn-cancel:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-light));
	}

	/* ===== Text Buttons ===== */
	.btn-text {
		background: none;
		border: none;
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		cursor: pointer;
		padding: var(--space-0\.5) var(--space-1\.5);
		border-radius: var(--radius-sm);
		transition: var(--transition-colors);
	}
	.btn-deactivate {
		color: hsl(var(--destructive-default));
	}
	.btn-deactivate:hover {
		background: hsl(var(--destructive-200));
	}
	.btn-activate {
		color: hsl(var(--success-default));
	}
	.btn-activate:hover {
		background: hsl(var(--success-200));
	}

	/* ===== Deleted Section ===== */
	.deleted-section {
		border-top: var(--border-width) solid hsl(var(--border-muted));
	}
	.deleted-summary {
		padding: var(--space-3) var(--space-5);
		font-size: var(--text-xs);
		color: hsl(var(--fg-muted));
		cursor: pointer;
		user-select: none;
	}
	.deleted-summary:hover {
		color: hsl(var(--fg-light));
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

	/* Toggle switch appearance */
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

	/* ===== Field Groups ===== */
	.field-group {
		margin-top: var(--space-4);
	}
	.field-label {
		display: block;
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		margin-bottom: var(--space-1);
	}
	.field-input {
		width: 100%;
		padding: var(--space-2) var(--space-2\.5);
		font-size: var(--text-sm);
		background: hsl(var(--bg-control));
		color: hsl(var(--fg-default));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		letter-spacing: var(--tracking-mono);
	}
	.field-input:focus {
		outline: none;
		border-color: hsl(var(--border-focus));
	}
	.field-input:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.field-hint {
		display: block;
		margin-top: var(--space-1);
		font-size: var(--text-2xs);
		color: hsl(var(--fg-muted));
	}

	/* ===== Cursor Rate Row (stats + step toggle) ===== */
	.cursor-rate-row {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-3) 0;
	}

	/* Stats cluster */
	.cursor-stats {
		display: flex;
		gap: var(--space-5);
		flex-shrink: 0;
	}
	.stat-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.stat-label {
		font-size: var(--text-2xs);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: hsl(var(--fg-muted));
		white-space: nowrap;
	}
	.stat-value {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		font-family: var(--font-mono);
		color: hsl(var(--fg-default));
		white-space: nowrap;
	}
	.stat-unit {
		font-weight: var(--font-normal);
		color: hsl(var(--fg-lighter));
	}

	/* Step toggle track */
	.step-track {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex: 1;
		min-width: 180px;
		height: 40px;
	}
	.step-rail {
		position: absolute;
		top: 27%;
		left: 2%;
		right: 2%;
		height: 2px;
		background: hsl(var(--border-default));
		pointer-events: none;
	}
	.step-stop {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.stop-dot {
		width: 14px;
		height: 14px;
		border-radius: var(--radius-full);
		border: 2px solid hsl(var(--border-default));
		background: hsl(var(--bg-surface-100));
		transition: border-color var(--duration-normal) var(--ease-default),
			background var(--duration-normal) var(--ease-default),
			box-shadow var(--duration-normal) var(--ease-default);
	}
	.step-stop:hover .stop-dot {
		border-color: hsl(var(--fg-lighter));
	}
	.step-stop.active .stop-dot {
		border-color: hsl(var(--brand-default));
		background: hsl(var(--brand-default));
		box-shadow: 0 0 0 3px hsla(var(--brand-default) / 0.25);
	}
	.stop-label {
		font-size: var(--text-2xs);
		font-family: var(--font-mono);
		color: hsl(var(--fg-muted));
		white-space: nowrap;
		transition: color var(--duration-normal) var(--ease-default);
	}
	.step-stop.active .stop-label {
		color: hsl(var(--fg-default));
		font-weight: var(--font-semibold);
	}
	.stop-unit {
		font-size: var(--text-2xs);
		color: hsl(var(--fg-muted));
		font-weight: var(--font-normal);
		margin-left: 1px;
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

	/* ===== Error Banner ===== */
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-3) var(--space-5);
		padding: var(--space-2\.5) var(--space-3);
		background: hsl(var(--destructive-200));
		border: var(--border-width) solid hsl(var(--destructive-400));
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		color: hsl(var(--destructive-default));
	}

	/* ===== Loading State ===== */
	.loading-state {
		padding: var(--space-8) var(--space-5);
		text-align: center;
		font-size: var(--text-sm);
		color: hsl(var(--fg-muted));
	}

	/* ===== Save Bar ===== */
	.save-bar {
		position: sticky;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-5);
		background: hsl(var(--bg-surface-300));
		border: var(--border-width) solid hsl(var(--border-strong));
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: var(--z-sticky);
	}
	.save-bar.saved {
		border-color: hsl(var(--success-500));
	}
	.save-message {
		display: flex;
		align-items: center;
		gap: var(--space-1\.5);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-default));
	}
	.saved .save-message {
		color: hsl(var(--success-default));
	}
	.save-actions {
		display: flex;
		gap: var(--space-2);
	}
	.btn-secondary {
		padding: var(--space-1\.5) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		background: hsl(var(--bg-surface-200));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.btn-secondary:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}
	.btn-primary {
		padding: var(--space-1\.5) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-contrast));
		background: hsl(var(--brand-default));
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.btn-primary:hover {
		background: hsl(var(--brand-600));
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Restart indicators */
	.restart-notice {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-xs);
		color: hsl(var(--amber-400, 40 95% 60%));
		margin-left: var(--space-3);
		padding: var(--space-0\.5) var(--space-2);
		background: hsla(var(--amber-400, 40 95% 60%) / 0.1);
		border-radius: var(--radius-sm);
	}
	.restart-hint {
		font-size: var(--text-xs);
		color: hsl(var(--amber-400, 40 95% 60%));
		font-weight: var(--font-normal);
		margin-left: var(--space-1);
	}
</style>
