<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';
	import { api } from '$lib/client';
	import type { ApiKeyRow } from '$lib/client';
	import { createModalConfig, modalStore } from '$lib/modals/ModalRegistry';
	import {
		defaultTimePreferences,
		resetTimePreferences,
		timePreferences,
		updateTimePreferences
	} from '$lib/stores/timePreferencesStore';
	import {
		ABSOLUTE_TIME_FORMATS,
		TIME_DISPLAY_MODES,
		formatTimestampForUi,
		type AbsoluteTimeFormat,
		type TimeDisplayMode
	} from '$lib/utils/dateTime';

	let { data }: PageProps = $props();

	type SettingsTab = 'preferences' | 'api-keys';

	const FALLBACK_TIMEZONES = [
		'UTC',
		'Etc/UTC',
		'Africa/Johannesburg',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'America/New_York',
		'America/Phoenix',
		'America/Sao_Paulo',
		'Asia/Dubai',
		'Asia/Hong_Kong',
		'Asia/Kolkata',
		'Asia/Singapore',
		'Asia/Tokyo',
		'Australia/Perth',
		'Australia/Sydney',
		'Europe/Amsterdam',
		'Europe/Berlin',
		'Europe/London',
		'Europe/Madrid',
		'Europe/Paris',
		'Europe/Warsaw',
		'Pacific/Auckland'
	] as const;

	const ABSOLUTE_FORMAT_LABELS: Record<AbsoluteTimeFormat, string> = {
		'iso-like': 'ISO-like (YYYY-MM-DD HH:mm:ss TZ)',
		'locale-short': 'Localized (date + short time)',
		'utc-fixed': 'Fixed UTC (YYYY-MM-DD HH:mm:ss UTC)'
	};

	const DISPLAY_MODE_LABELS: Record<TimeDisplayMode, string> = {
		absolute: 'Absolute',
		relative: 'Relative'
	};

	type TimeZoneOptionsResult = {
		values: string[];
		source: 'supported' | 'fallback';
	};

	let activeTab = $state<SettingsTab>('preferences');
	let timeZoneOptions = $state<string[]>([]);
	let timeZoneSource = $state<'supported' | 'fallback'>('fallback');

	let apiKeys = $state<ApiKeyRow[]>([]);
	let loading = $state(true);
	let error = $state('');

	// New key form
	let newKeyName = $state('');
	let newKeyRole = $state<'reader' | 'analyst' | 'admin'>('analyst');
	let newKeyExpiry = $state<'never' | '30d' | '90d' | '1y'>('never');
	let creating = $state(false);

	// Newly created key (shown once)
	let newlyCreatedKey = $state<{ key: string; name: string } | null>(null);
	let copied = $state(false);

	async function fetchKeys() {
		loading = true;
		error = '';
		try {
			apiKeys = await api.apiKeys.list();
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}

	async function createKey() {
		if (!newKeyName.trim()) return;
		creating = true;
		error = '';

		let expires_at: number | undefined;
		const now = Math.floor(Date.now() / 1000);
		if (newKeyExpiry === '30d') expires_at = now + 30 * 86400;
		else if (newKeyExpiry === '90d') expires_at = now + 90 * 86400;
		else if (newKeyExpiry === '1y') expires_at = now + 365 * 86400;

		try {
			const result = await api.apiKeys.create({
				name: newKeyName.trim(),
				role: newKeyRole,
				expires_at
			});
			newlyCreatedKey = { key: result.key, name: result.name };
			newKeyName = '';
			newKeyRole = 'analyst';
			newKeyExpiry = 'never';
			await fetchKeys();
		} catch (err) {
			error = (err as Error).message;
		} finally {
			creating = false;
		}
	}

	async function revokeKey(id: string, name: string) {
		if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
		error = '';
		try {
			await api.apiKeys.revoke(id);
			await fetchKeys();
		} catch (err) {
			error = (err as Error).message;
		}
	}

	async function copyToClipboard(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function isExpired(key: ApiKeyRow): boolean {
		if (!key.expires_at) return false;
		return key.expires_at < Math.floor(Date.now() / 1000);
	}

	let activeKeys = $derived(apiKeys.filter((k: ApiKeyRow) => !k.revoked_at && !isExpired(k)));
	let inactiveKeys = $derived(apiKeys.filter((k: ApiKeyRow) => k.revoked_at || isExpired(k)));
	let isDefaultTimePreferences = $derived(
		$timePreferences.timezone === defaultTimePreferences.timezone &&
			$timePreferences.absoluteFormat === defaultTimePreferences.absoluteFormat &&
			$timePreferences.displayMode === defaultTimePreferences.displayMode &&
			$timePreferences.showTooltipAlternate === defaultTimePreferences.showTooltipAlternate
	);
	let previewAbsolute = $derived(
		formatTimestampForUi(
			Math.floor(Date.now() / 1000),
			{ ...$timePreferences, displayMode: 'absolute' },
			{ nowEpochSeconds: Math.floor(Date.now() / 1000) }
		).text
	);
	let previewRelative = $derived(
		formatTimestampForUi(
			Math.floor(Date.now() / 1000),
			{ ...$timePreferences, displayMode: 'relative' },
			{ nowEpochSeconds: Math.floor(Date.now() / 1000) }
		).text
	);

	function getTimeZoneOptions(): TimeZoneOptionsResult {
		const withCurrent = new Set<string>([$timePreferences.timezone, ...FALLBACK_TIMEZONES]);
		const intlWithSupportedValues = Intl as typeof Intl & {
			supportedValuesOf?: (key: 'timeZone') => string[];
		};

		if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
			try {
				const supported = intlWithSupportedValues.supportedValuesOf('timeZone');
				for (const tz of supported) {
					withCurrent.add(tz);
				}

				return {
					values: Array.from(withCurrent).sort((a, b) => a.localeCompare(b)),
					source: 'supported'
				};
			} catch {
				// Fall through to fallback values.
			}
		}

		return {
			values: Array.from(withCurrent).sort((a, b) => a.localeCompare(b)),
			source: 'fallback'
		};
	}

	function handleTimeZoneChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement | null;
		if (!select) return;
		updateTimePreferences({ timezone: select.value });
	}

	function handleAbsoluteFormatChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement | null;
		if (!select) return;
		updateTimePreferences({ absoluteFormat: select.value as AbsoluteTimeFormat });
	}

	function handleDisplayModeChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement | null;
		if (!select) return;
		updateTimePreferences({ displayMode: select.value as TimeDisplayMode });
	}

	function handleTooltipAlternateToggle(event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		if (!input) return;
		updateTimePreferences({ showTooltipAlternate: input.checked });
	}

	function openQuickPreferencesModal() {
		modalStore.open(createModalConfig('time_preferences', 'edit'));
	}

	$effect(() => {
		if (timeZoneOptions.length > 0) return;
		const result = getTimeZoneOptions();
		timeZoneOptions = result.values;
		timeZoneSource = result.source;
	});

	$effect(() => {
		const timezone = $timePreferences.timezone;
		if (!timezone || timeZoneOptions.includes(timezone)) return;
		timeZoneOptions = [timezone, ...timeZoneOptions].sort((a, b) => a.localeCompare(b));
	});

	onMount(() => {
		document.title = 'Settings — TimmyLine';
		fetchKeys();
	});
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">Settings</h1>
</header>

<div class="page-content">
	<div class="settings-tabs" role="tablist" aria-label="Settings sections">
		<button
			type="button"
			class="settings-tab"
			class:active={activeTab === 'preferences'}
			role="tab"
			aria-selected={activeTab === 'preferences'}
			onclick={() => (activeTab = 'preferences')}
		>
			Preferences
		</button>
		<button
			type="button"
			class="settings-tab"
			class:active={activeTab === 'api-keys'}
			role="tab"
			aria-selected={activeTab === 'api-keys'}
			onclick={() => (activeTab = 'api-keys')}
		>
			API Keys
		</button>
	</div>

	{#if activeTab === 'preferences'}
		<section class="settings-section">
			<div class="section-header">
				<h2 class="section-title">Time Display Preferences</h2>
				<p class="section-description">
					Control timezone and timestamp formatting across timeline views and details.
				</p>
			</div>

			<div class="preferences-card">
				<div class="preferences-grid">
					<div class="preferences-field preferences-field-full">
						<label class="preferences-label" for="settings-timezone">Timezone</label>
						<select
							id="settings-timezone"
							class="preferences-input mono"
							value={$timePreferences.timezone}
							onchange={handleTimeZoneChange}
						>
							{#if timeZoneOptions.length === 0}
								<option value={$timePreferences.timezone}>{$timePreferences.timezone}</option>
							{:else}
								{#each timeZoneOptions as timezone (timezone)}
									<option value={timezone}>{timezone}</option>
								{/each}
							{/if}
						</select>
						<p class="preferences-hint">
							{#if timeZoneSource === 'supported'}
								Loaded from <code>Intl.supportedValuesOf('timeZone')</code>.
							{:else}
								Using fallback timezone list.
							{/if}
						</p>
					</div>

					<div class="preferences-field">
						<label class="preferences-label" for="settings-absolute-format">Absolute Format</label>
						<select
							id="settings-absolute-format"
							class="preferences-input"
							value={$timePreferences.absoluteFormat}
							onchange={handleAbsoluteFormatChange}
						>
							{#each ABSOLUTE_TIME_FORMATS as format (format)}
								<option value={format}>{ABSOLUTE_FORMAT_LABELS[format]}</option>
							{/each}
						</select>
					</div>

					<div class="preferences-field">
						<label class="preferences-label" for="settings-display-mode">Display Mode</label>
						<select
							id="settings-display-mode"
							class="preferences-input"
							value={$timePreferences.displayMode}
							onchange={handleDisplayModeChange}
						>
							{#each TIME_DISPLAY_MODES as mode (mode)}
								<option value={mode}>{DISPLAY_MODE_LABELS[mode]}</option>
							{/each}
						</select>
					</div>
				</div>

				<label class="preferences-toggle" for="settings-tooltip-alternate">
					<input
						id="settings-tooltip-alternate"
						type="checkbox"
						checked={$timePreferences.showTooltipAlternate}
						onchange={handleTooltipAlternateToggle}
					/>
					<span class="preferences-toggle-copy">
						<span class="preferences-toggle-title">Show alternate timestamp in tooltip</span>
						<span class="preferences-toggle-description">
							When enabled, relative timestamps show absolute time on hover and vice versa.
						</span>
					</span>
				</label>

				<div class="preferences-preview">
					<div class="preferences-preview-header">Preview</div>
					<div class="preferences-preview-grid">
						<div class="preferences-preview-item">
							<span class="preferences-preview-label">Absolute</span>
							<span class="preferences-preview-value mono">{previewAbsolute}</span>
						</div>
						<div class="preferences-preview-item">
							<span class="preferences-preview-label">Relative</span>
							<span class="preferences-preview-value mono">{previewRelative}</span>
						</div>
					</div>
				</div>

				<div class="preferences-actions">
					<button
						type="button"
						class="btn-secondary"
						onclick={() => resetTimePreferences()}
						disabled={isDefaultTimePreferences}
					>
						Reset to Defaults
					</button>
					<button type="button" class="btn-secondary" onclick={openQuickPreferencesModal}>
						Open Quick Preferences Modal
					</button>
				</div>
			</div>
		</section>
	{:else}
	<!-- API Keys Section -->
	<section class="settings-section">
		<div class="section-header">
			<h2 class="section-title">API Keys</h2>
			<p class="section-description">
				Generate API keys for MCP servers, scripts, and CI/CD pipelines. Each key acts on behalf
				of your analyst account with scoped permissions.
			</p>
		</div>

		<!-- New Key Reveal Banner -->
		{#if newlyCreatedKey}
			<div class="key-reveal-banner">
				<div class="key-reveal-header">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="key-reveal-icon" aria-hidden="true">
						<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
					</svg>
					<strong>Key created: {newlyCreatedKey.name}</strong>
				</div>
				<p class="key-reveal-warning">Copy this key now — it will not be shown again.</p>
				<div class="key-reveal-value">
					<code class="key-text">{newlyCreatedKey.key}</code>
					<button class="btn-copy" onclick={() => copyToClipboard(newlyCreatedKey!.key)}>
						{#if copied}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
								<polyline points="20 6 9 17 4 12" />
							</svg>
							Copied
						{:else}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
								<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
								<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
							</svg>
							Copy
						{/if}
					</button>
				</div>
				<div class="key-reveal-hint">
					<span class="hint-label">MCP config:</span>
					<code class="hint-code">"MCP_API_KEY": "{newlyCreatedKey.key}"</code>
				</div>
				<button class="btn-dismiss" onclick={() => (newlyCreatedKey = null)}>Dismiss</button>
			</div>
		{/if}

		<!-- Create New Key Form -->
		<div class="create-key-card">
			<h3 class="card-title">Generate New Key</h3>
			<form class="create-key-form" onsubmit={(e) => { e.preventDefault(); createKey(); }}>
				<div class="form-row">
					<div class="form-field">
						<label class="form-label" for="key-name">Name</label>
						<input
							id="key-name"
							type="text"
							class="form-input"
							placeholder="e.g. Copilot MCP, CI Pipeline"
							bind:value={newKeyName}
							maxlength="100"
							required
						/>
					</div>
					<div class="form-field">
						<label class="form-label" for="key-role">Max Role</label>
						<select id="key-role" class="form-select" bind:value={newKeyRole}>
							<option value="reader">Reader</option>
							<option value="analyst">Analyst</option>
							<option value="admin">Admin</option>
						</select>
					</div>
					<div class="form-field">
						<label class="form-label" for="key-expiry">Expires</label>
						<select id="key-expiry" class="form-select" bind:value={newKeyExpiry}>
							<option value="never">Never</option>
							<option value="30d">30 days</option>
							<option value="90d">90 days</option>
							<option value="1y">1 year</option>
						</select>
					</div>
					<button type="submit" class="btn-primary" disabled={creating || !newKeyName.trim()}>
						{#if creating}
							Generating…
						{:else}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							Generate Key
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- Error display -->
		{#if error}
			<div class="error-banner" role="alert">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
					<circle cx="12" cy="12" r="10" />
					<line x1="15" y1="9" x2="9" y2="15" />
					<line x1="9" y1="9" x2="15" y2="15" />
				</svg>
				{error}
			</div>
		{/if}

		<!-- Active Keys Table -->
		{#if loading}
			<div class="loading-state">Loading API keys…</div>
		{:else}
			<div class="keys-table-wrapper">
				<div class="toolbar">
					<span class="toolbar-title">Active Keys ({activeKeys.length})</span>
				</div>
				{#if activeKeys.length === 0}
					<div class="empty-state">No active API keys. Generate one above.</div>
				{:else}
					<table class="keys-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Key</th>
								<th>Role</th>
								<th>Created</th>
								<th>Last Used</th>
								<th>Expires</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each activeKeys as key (key.id)}
								{@const nowEpoch = Math.floor(Date.now() / 1000)}
								{@const createdAtUi = formatTimestampForUi(key.created_at, $timePreferences, { nowEpochSeconds: nowEpoch })}
								{@const lastUsedAtUi = formatTimestampForUi(key.last_used_at, $timePreferences, { nowEpochSeconds: nowEpoch })}
								{@const expiresAtUi = formatTimestampForUi(key.expires_at, $timePreferences, { nowEpochSeconds: nowEpoch })}
								<tr>
									<td class="cell-name">{key.name}</td>
									<td class="cell-key"><code>{key.key_prefix}…</code></td>
									<td class="cell-role">
										<span class="role-badge" class:role-reader={key.role === 'reader'} class:role-analyst={key.role === 'analyst'} class:role-admin={key.role === 'admin'}>
											{key.role}
										</span>
									</td>
									<td class="cell-date mono" title={createdAtUi.tooltip ?? undefined}>{createdAtUi.text}</td>
									<td class="cell-date mono" title={lastUsedAtUi.tooltip ?? undefined}>{lastUsedAtUi.text}</td>
									<td class="cell-date mono" title={expiresAtUi.tooltip ?? undefined}>
										{#if key.expires_at}
											{expiresAtUi.text}
										{:else}
											Never
										{/if}
									</td>
									<td class="cell-actions">
										<button class="btn-revoke" onclick={() => revokeKey(key.id, key.name)} title="Revoke this key">
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
												<circle cx="12" cy="12" r="10" />
												<line x1="15" y1="9" x2="9" y2="15" />
												<line x1="9" y1="9" x2="15" y2="15" />
											</svg>
											Revoke
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Inactive / Revoked Keys -->
			{#if inactiveKeys.length > 0}
				<div class="keys-table-wrapper inactive">
					<div class="toolbar">
						<span class="toolbar-title">Revoked / Expired ({inactiveKeys.length})</span>
					</div>
					<table class="keys-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>Key</th>
								<th>Role</th>
								<th>Created</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{#each inactiveKeys as key (key.id)}
								{@const nowEpoch = Math.floor(Date.now() / 1000)}
								{@const createdAtUi = formatTimestampForUi(key.created_at, $timePreferences, { nowEpochSeconds: nowEpoch })}
								{@const revokedAtUi = formatTimestampForUi(key.revoked_at, $timePreferences, { nowEpochSeconds: nowEpoch })}
								<tr class="row-inactive">
									<td class="cell-name">{key.name}</td>
									<td class="cell-key"><code>{key.key_prefix}…</code></td>
									<td class="cell-role">
										<span class="role-badge role-inactive">{key.role}</span>
									</td>
									<td class="cell-date mono" title={createdAtUi.tooltip ?? undefined}>{createdAtUi.text}</td>
									<td class="cell-status">
										{#if key.revoked_at}
											<span class="status-revoked" title={revokedAtUi.tooltip ?? undefined}>Revoked {revokedAtUi.text}</span>
										{:else}
											<span class="status-expired">Expired</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}
	</section>
	{/if}
</div>

<style>
	/* ============================================================
	   Page Layout — SOP §11.1
	   ============================================================ */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-6);
		border-bottom: var(--border-width) solid hsl(var(--border-default));
		background: hsl(var(--bg-surface-100));
		min-height: 48px;
	}
	.page-title {
		font-family: var(--font-family);
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		margin: 0;
	}
	.page-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: var(--space-4) var(--space-6);
		overflow-y: auto;
	}

	.settings-tabs {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1);
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		width: fit-content;
	}

	.settings-tab {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 28px;
		padding: var(--space-1) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		background: transparent;
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.settings-tab:hover {
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-surface-200));
	}

	.settings-tab.active {
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-surface-300));
		border-color: hsl(var(--border-strong));
	}

	.settings-tab:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	/* ============================================================
	   Settings Section
	   ============================================================ */
	.settings-section {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.section-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.section-title {
		font-family: var(--font-family);
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		margin: 0;
	}
	.section-description {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
		margin: 0;
		max-width: 640px;
	}

	.preferences-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4);
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
	}

	.preferences-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}

	.preferences-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.preferences-field-full {
		grid-column: 1 / -1;
	}

	.preferences-label {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.preferences-input {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-control));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-sm);
		padding: var(--space-1\.5) var(--space-2);
		min-height: 32px;
		transition: var(--transition-colors);
	}

	.preferences-input:focus {
		outline: none;
		border-color: hsl(var(--border-focus));
	}

	.preferences-hint {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		line-height: var(--leading-snug);
		color: hsl(var(--fg-lighter));
		margin: 0;
	}

	.preferences-hint code {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-data));
	}

	.preferences-toggle {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-surface-75));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.preferences-toggle input {
		margin-top: var(--space-0\.5);
	}

	.preferences-toggle-copy {
		display: flex;
		flex-direction: column;
		gap: var(--space-0\.5);
	}

	.preferences-toggle-title {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-default));
	}

	.preferences-toggle-description {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.preferences-preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: hsl(var(--bg-surface-75));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
	}

	.preferences-preview-header {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: hsl(var(--fg-lighter));
	}

	.preferences-preview-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}

	.preferences-preview-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.preferences-preview-label {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.preferences-preview-value {
		font-size: var(--text-sm);
		color: hsl(var(--fg-data));
		word-break: break-word;
	}

	.preferences-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-light));
		background: hsl(var(--bg-surface-300));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		min-height: 32px;
	}

	.btn-secondary:hover:not(:disabled) {
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-surface-400));
		border-color: hsl(var(--border-strong));
	}

	.btn-secondary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* ============================================================
	   Key Reveal Banner
	   ============================================================ */
	.key-reveal-banner {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: hsl(var(--warning-300));
		border: var(--border-width) solid hsl(var(--warning-500));
		border-radius: var(--radius-md);
	}
	.key-reveal-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--warning-default));
	}
	.key-reveal-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}
	.key-reveal-warning {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		color: hsl(var(--fg-light));
		margin: 0;
	}
	.key-reveal-value {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-sm);
	}
	.key-text {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-data));
		word-break: break-all;
		flex: 1;
		user-select: all;
	}
	.btn-copy {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		font-family: var(--font-family);
		font-size: var(--text-xs);
		color: hsl(var(--fg-light));
		background: hsl(var(--bg-surface-300));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
		white-space: nowrap;
	}
	.btn-copy:hover {
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-surface-400));
	}
	.key-reveal-hint {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-xs);
	}
	.hint-label {
		color: hsl(var(--fg-lighter));
		font-family: var(--font-family);
	}
	.hint-code {
		font-family: var(--font-mono);
		color: hsl(var(--fg-light));
		background: hsl(var(--bg-surface-100));
		padding: var(--space-0\.5) var(--space-1);
		border-radius: var(--radius-sm);
	}
	.btn-dismiss {
		align-self: flex-start;
		padding: var(--space-1) var(--space-2);
		font-family: var(--font-family);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		background: transparent;
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.btn-dismiss:hover {
		color: hsl(var(--fg-light));
		border-color: hsl(var(--border-strong));
	}

	/* ============================================================
	   Create Key Card
	   ============================================================ */
	.create-key-card {
		padding: var(--space-3) var(--space-4);
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
	}
	.card-title {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		margin: 0 0 var(--space-3) 0;
	}
	.create-key-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.form-row {
		display: flex;
		align-items: flex-end;
		gap: var(--space-3);
		flex-wrap: wrap;
	}
	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.form-field:first-child {
		flex: 1;
		min-width: 200px;
	}
	.form-label {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}
	.form-input,
	.form-select {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-control));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-sm);
		padding: var(--space-1\.5) var(--space-2);
		min-height: 32px;
		transition: var(--transition-colors);
	}
	.form-input:focus,
	.form-select:focus {
		border-color: hsl(var(--border-focus));
		outline: none;
	}
	.form-input::placeholder {
		color: hsl(var(--fg-lighter));
	}

	/* ============================================================
	   Primary Button
	   ============================================================ */
	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-contrast));
		background: hsl(var(--brand-default));
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		min-height: 32px;
		white-space: nowrap;
	}
	.btn-primary:hover:not(:disabled) {
		background: hsl(var(--brand-600));
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.btn-primary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	/* ============================================================
	   Error Banner
	   ============================================================ */
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--destructive-300));
		border: var(--border-width) solid hsl(var(--destructive-500));
		border-radius: var(--radius-md);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--destructive-default));
	}

	/* ============================================================
	   Loading & Empty States
	   ============================================================ */
	.loading-state,
	.empty-state {
		padding: var(--space-6);
		text-align: center;
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-lighter));
	}

	/* ============================================================
	   Keys Table
	   ============================================================ */
	.keys-table-wrapper {
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.keys-table-wrapper.inactive {
		opacity: 0.7;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-surface-200));
		border-bottom: var(--border-width) solid hsl(var(--border-default));
		min-height: 36px;
	}
	.toolbar-title {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-light));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}
	.keys-table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-family);
		font-size: var(--text-sm);
	}
	.keys-table thead {
		background: hsl(var(--bg-surface-300));
	}
	.keys-table th {
		padding: var(--space-1\.5) var(--space-3);
		text-align: left;
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-lighter));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		border-bottom: var(--border-width) solid hsl(var(--border-default));
	}
	.keys-table td {
		padding: var(--space-2) var(--space-3);
		color: hsl(var(--fg-default));
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		vertical-align: middle;
	}
	.keys-table tbody tr:hover {
		background: hsl(var(--bg-surface-75));
	}
	.keys-table tbody tr:last-child td {
		border-bottom: none;
	}

	.cell-name {
		font-weight: var(--font-medium);
	}
	.cell-key code {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-data));
		background: hsl(var(--bg-surface-200));
		padding: var(--space-0\.5) var(--space-1);
		border-radius: var(--radius-sm);
	}
	.cell-date {
		color: hsl(var(--fg-light));
		font-size: var(--text-xs);
	}
	.mono {
		font-family: var(--font-mono);
	}

	/* Role Badges */
	.role-badge {
		display: inline-flex;
		align-items: center;
		padding: var(--space-0\.5) var(--space-1\.5);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		border-radius: var(--radius-sm);
		text-transform: capitalize;
	}
	.role-reader {
		color: hsl(var(--info-default));
		background: hsl(var(--info-200));
	}
	.role-analyst {
		color: hsl(var(--success-default));
		background: hsl(var(--success-200));
	}
	.role-admin {
		color: hsl(var(--warning-default));
		background: hsl(var(--warning-200));
	}
	.role-inactive {
		color: hsl(var(--fg-muted));
		background: hsl(var(--bg-muted));
	}

	/* Status Badges */
	.status-revoked {
		color: hsl(var(--destructive-default));
		font-size: var(--text-xs);
	}
	.status-expired {
		color: hsl(var(--warning-default));
		font-size: var(--text-xs);
	}

	/* Revoke Button */
	.btn-revoke {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		font-family: var(--font-family);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		background: transparent;
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.btn-revoke:hover {
		color: hsl(var(--destructive-default));
		border-color: hsl(var(--destructive-default));
		background: hsl(var(--destructive-300));
	}
	.btn-revoke:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.cell-actions {
		text-align: right;
	}

	.row-inactive td {
		color: hsl(var(--fg-muted));
	}
	.row-inactive .cell-name {
		text-decoration: line-through;
	}
</style>
