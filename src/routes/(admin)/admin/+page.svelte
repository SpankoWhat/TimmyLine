<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/client';
	import type { AdminAnalyst, AppSettingsMap } from '$lib/client';
	import AdminUserManagement from '$lib/components/admin/AdminUserManagement.svelte';
	import AdminAuthentication from '$lib/components/admin/AdminAuthentication.svelte';
	import AdminLogging from '$lib/components/admin/AdminLogging.svelte';
	import AdminCollaboration from '$lib/components/admin/AdminCollaboration.svelte';
	import AdminSaveBar from '$lib/components/admin/AdminSaveBar.svelte';

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

	// Track pending changes for settings
	let pendingSettings = $state<Record<string, string>>({});
	let hasPendingChanges = $derived(Object.keys(pendingSettings).length > 0);
	let pendingCount = $derived(Object.keys(pendingSettings).length);

	// Keys that require a server restart to take effect
	const RESTART_KEYS = new Set([
		'auth.google_enabled', 'auth.microsoft_enabled', 'auth.github_enabled',
		'logging.file_path', 'logging.write_to_file'
	]);
	let pendingNeedsRestart = $derived(
		Object.keys(pendingSettings).some(k => RESTART_KEYS.has(k))
	);

	// ── Settings helpers (passed to child components) ──
	function getSettingValue(key: string): string {
		return pendingSettings[key] ?? settings[key] ?? '';
	}

	function setSetting(key: string, value: string) {
		if (value === settings[key]) {
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
	<AdminUserManagement
		{analysts}
		loading={loadingAnalysts}
		error={analystsError}
		onanalystschange={(updated) => { analysts = updated; }}
		onerror={(err) => { analystsError = err; }}
	/>

	<AdminAuthentication
		loading={loadingSettings}
		{getSettingValue}
		{setSetting}
		{setSettingBool}
		{isSettingTrue}
	/>

	<AdminLogging
		loading={loadingSettings}
		{getSettingValue}
		{setSetting}
		{setSettingBool}
		{isSettingTrue}
	/>

	<AdminCollaboration
		loading={loadingSettings}
		{getSettingValue}
		{setSetting}
	/>

	<AdminSaveBar
		{hasPendingChanges}
		{pendingCount}
		{pendingNeedsRestart}
		{settingsSaved}
		{restartRequired}
		{savingSettings}
		{settingsError}
		onsave={saveSettings}
		ondiscard={() => { pendingSettings = {}; }}
	/>
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
</style>
