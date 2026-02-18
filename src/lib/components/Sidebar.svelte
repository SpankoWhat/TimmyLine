<script lang="ts">
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { currentSelectedIncident } from '$lib/stores/cacheStore';
	import { onMount, onDestroy } from 'svelte';

	const STORAGE_KEY = 'timmyline-sidebar-expanded';

	let expanded = $state(browser ? localStorage.getItem(STORAGE_KEY) !== 'false' : true);

	type HealthStatus = {
		status: 'healthy' | 'degraded' | 'unhealthy';
		database: string;
		mcp: string;
		mcpPid: number | null;
		mcpError?: string | null;
		error?: string;
	};

	let health = $state<HealthStatus | null>(null);
	let healthInterval: ReturnType<typeof setInterval> | undefined;

	let currentPath = $derived(page.url.pathname);
	let selectedIncident = $derived($currentSelectedIncident);
	let incidentPath = $derived(selectedIncident ? `/incident/${selectedIncident.uuid}` : null);

	function toggleSidebar() {
		expanded = !expanded;
		if (browser) {
			localStorage.setItem(STORAGE_KEY, String(expanded));
		}
	}

	function openCommandPalette() {
		if (browser) {
			document.dispatchEvent(new CustomEvent('open-command-palette'));
		}
	}

	function isActive(path: string): boolean {
		if (path === '/home') {
			return currentPath === '/home' || currentPath === '/';
		}
		return currentPath.startsWith(path);
	}

	type NavItem = {
		label: string;
		path: string;
		icon: string;
		conditional?: boolean;
	};

	let mainItems: NavItem[] = [
		{ label: 'Dashboard', path: '/home', icon: 'grid' },
		{ label: 'Incidents', path: '/home', icon: 'alert-triangle' }
	];

	let investigationItems = $derived.by(() => {
		const items: NavItem[] = [];
		if (incidentPath) {
			items.push({
				label: 'Current Incident',
				path: incidentPath,
				icon: 'clock'
			});
		}
		return items;
	});

	async function fetchHealth() {
		if (!browser) return;
		try {
			const response = await fetch('/api/health');
			const data = await response.json();
			health = data;
		} catch (error) {
			console.error('Failed to fetch health status:', error);
			health = {
				status: 'unhealthy',
				database: 'error',
				mcp: 'unknown',
				mcpPid: null,
				error: 'Failed to connect'
			};
		}
	}

	onMount(() => {
		fetchHealth();
		// Refresh health status every 30 seconds
		healthInterval = setInterval(fetchHealth, 30000);
	});

	onDestroy(() => {
		if (healthInterval) {
			clearInterval(healthInterval);
		}
	});
</script>

<aside class="sidebar" class:expanded aria-label="Sidebar">
	<!-- Header: Logo -->
	<div class="sidebar-header">
		<svg class="sidebar-logo" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
			<rect width="28" height="28" rx="6" fill="hsl(36, 100%, 50%)" />
		</svg>
		<span class="sidebar-brand">TimmyLine</span>
	</div>

	<!-- Search Button -->
	<div class="sidebar-search-wrapper">
		<button
			class="sidebar-search-btn"
			onclick={openCommandPalette}
			aria-label="Open command palette"
			title={expanded ? undefined : 'Search (Ctrl+K)'}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="sidebar-item-icon"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
			<span class="sidebar-item-label">Search</span>
			<kbd class="sidebar-search-kbd">Ctrl+K</kbd>
		</button>
	</div>

	<!-- Navigation -->
	<nav class="sidebar-nav" aria-label="Main navigation">
		<!-- Main Section -->
		<span class="sidebar-section-label">Main</span>
		{#each mainItems as item (item.label)}
			<a
				href={item.path}
				class="sidebar-item"
				class:active={isActive(item.path)}
				title={expanded ? undefined : item.label}
				aria-current={isActive(item.path) ? 'page' : undefined}
			>
				{#if item.icon === 'grid'}
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="sidebar-item-icon"
						aria-hidden="true"
					>
						<rect x="3" y="3" width="7" height="7" />
						<rect x="14" y="3" width="7" height="7" />
						<rect x="3" y="14" width="7" height="7" />
						<rect x="14" y="14" width="7" height="7" />
					</svg>
				{:else if item.icon === 'alert-triangle'}
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="sidebar-item-icon"
						aria-hidden="true"
					>
						<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
						<line x1="12" y1="9" x2="12" y2="13" />
						<line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
				{/if}
				<span class="sidebar-item-label">{item.label}</span>
			</a>
		{/each}

		<!-- Investigation Section (conditional) -->
		{#if investigationItems.length > 0}
			<span class="sidebar-section-label">Investigation</span>
			{#each investigationItems as item (item.label)}
				<a
					href={item.path}
					class="sidebar-item"
					class:active={incidentPath ? isActive(incidentPath) : false}
					title={expanded ? undefined : item.label}
					aria-current={incidentPath && isActive(incidentPath) ? 'page' : undefined}
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="sidebar-item-icon"
						aria-hidden="true"
					>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
					<span class="sidebar-item-label">{item.label}</span>
				</a>
			{/each}
		{/if}
	</nav>

	<!-- Footer: Health Status, Settings + Toggle -->
	<div class="sidebar-footer">
		<!-- Health Status -->
		{#if health}
			<div class="sidebar-health" title={expanded ? undefined : `DB: ${health.database} | MCP: ${health.mcp}`}>
				<!-- Database Status -->
				<div class="sidebar-health-row">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="sidebar-health-icon"
						class:health-icon-healthy={health.database === 'connected'}
						class:health-icon-unhealthy={health.database !== 'connected'}
						aria-hidden="true"
					>
						<ellipse cx="12" cy="5" rx="9" ry="3" />
						<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
						<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
					</svg>
					<span class="sidebar-item-label sidebar-health-text">
						<span class="sidebar-health-label">DB:</span>
						<span class="sidebar-health-value mono">{health.database}</span>
					</span>
				</div>
				
				<!-- MCP Status -->
				<div class="sidebar-health-row">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="sidebar-health-icon"
						class:health-icon-healthy={health.mcp === 'running'}
						class:health-icon-unhealthy={health.mcp === 'stopped' || health.mcp === 'unknown'}
						aria-hidden="true"
					>
						<polyline points="16 18 22 12 16 6" />
						<polyline points="8 6 2 12 8 18" />
					</svg>
					<span class="sidebar-item-label sidebar-health-text">
						<span class="sidebar-health-label">MCP:</span>
						<span class="sidebar-health-value mono">{health.mcp}</span>
					</span>
				</div>
			</div>
		{/if}

		<a
			href="/settings"
			class="sidebar-item"
			class:active={isActive('/settings')}
			title={expanded ? undefined : 'Settings'}
			aria-current={isActive('/settings') ? 'page' : undefined}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="sidebar-item-icon"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
			</svg>
			<span class="sidebar-item-label">Settings</span>
		</a>

		<button
			class="sidebar-toggle"
			onclick={toggleSidebar}
			aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
			title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
		>
			{#if expanded}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="sidebar-item-icon"
					aria-hidden="true"
				>
					<polyline points="15 18 9 12 15 6" />
				</svg>
			{:else}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="sidebar-item-icon"
					aria-hidden="true"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			{/if}
		</button>
	</div>
</aside>

<style>
	/* ===== Sidebar Container ===== */
	.sidebar {
		position: sticky;
		top: 0;
		left: 0;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		height: 100vh;
		width: var(--sidebar-collapsed);
		background: hsl(var(--bg-sidebar));
		border-right: var(--border-width) solid hsl(var(--border-default));
		transition: var(--transition-sidebar);
		z-index: var(--z-sidebar);
		overflow: hidden;
	}

	.sidebar.expanded {
		width: var(--sidebar-expanded);
	}

	/* ===== Header ===== */
	.sidebar-header {
		display: flex;
		align-items: center;
		padding: var(--space-3) var(--space-3);
		min-height: 48px;
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
	}

	.sidebar-logo {
		width: 28px;
		height: 28px;
		flex-shrink: 0;
	}

	.sidebar-brand {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		margin-left: var(--space-3);
		white-space: nowrap;
		opacity: 0;
		transition: opacity var(--duration-normal) var(--ease-default);
	}

	.sidebar.expanded .sidebar-brand {
		opacity: 1;
	}

	/* ===== Search Button ===== */
	.sidebar-search-wrapper {
		padding: var(--space-2);
	}

	.sidebar-search-btn {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2);
		min-height: 36px;
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-lighter));
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		white-space: nowrap;
		overflow: hidden;
	}

	.sidebar-search-btn:hover {
		background: hsl(var(--bg-surface-200));
		border-color: hsl(var(--border-strong));
		color: hsl(var(--fg-default));
	}

	.sidebar-search-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.sidebar-search-kbd {
		display: none;
		margin-left: auto;
		padding: var(--space-0\.5) var(--space-1);
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		color: hsl(var(--fg-muted));
		background: hsl(var(--bg-surface-300));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-xs);
		line-height: var(--leading-none);
	}

	.sidebar.expanded .sidebar-search-kbd {
		display: inline-block;
	}

	/* ===== Navigation ===== */
	.sidebar-nav {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-0\.5);
		padding: var(--space-2);
		overflow-y: auto;
		overflow-x: hidden;
	}

	.sidebar-section-label {
		font-size: var(--text-2xs);
		font-weight: var(--font-medium);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: hsl(var(--fg-muted));
		padding: var(--space-2) var(--space-2) var(--space-1);
		white-space: nowrap;
		opacity: 0;
		transition: opacity var(--duration-normal) var(--ease-default);
	}

	.sidebar.expanded .sidebar-section-label {
		opacity: 1;
	}

	/* ===== Nav Items ===== */
	.sidebar-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2);
		min-height: 36px;
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		text-decoration: none;
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		width: 100%;
		white-space: nowrap;
		overflow: hidden;
	}

	.sidebar-item:hover {
		background: hsl(var(--bg-surface-200));
	}

	.sidebar-item.active {
		background: hsl(var(--bg-selection));
		color: hsl(var(--brand-default));
		border-left: var(--border-width-thick) solid hsl(var(--brand-default));
	}

	.sidebar-item:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.sidebar-item-icon {
		width: var(--icon-sm);
		height: var(--icon-sm);
		flex-shrink: 0;
	}

	.sidebar-item-label {
		opacity: 0;
		transition: opacity var(--duration-normal) var(--ease-default);
	}

	.sidebar.expanded .sidebar-item-label {
		opacity: 1;
	}

	/* ===== Footer ===== */
	.sidebar-footer {
		display: flex;
		flex-direction: column;
		gap: var(--space-0\.5);
		padding: var(--space-2);
		border-top: var(--border-width) solid hsl(var(--border-muted));
	}

	.sidebar-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: var(--space-2);
		min-height: 36px;
		font-family: var(--font-family);
		color: hsl(var(--fg-lighter));
		background: transparent;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.sidebar-toggle:hover {
		background: hsl(var(--bg-surface-200));
		color: hsl(var(--fg-default));
	}

	.sidebar-toggle:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	/* ===== Health Status ===== */
	.sidebar-health {
		display: flex;
		flex-direction: column;
		gap: var(--space-1\.5);
		padding: var(--space-2);
		border-radius: var(--radius-md);
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		white-space: nowrap;
		overflow: hidden;
	}

	.sidebar-health-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 20px;
	}

	.sidebar-health-icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.sidebar-health-text {
		display: flex;
		align-items: center;
		gap: var(--space-1\.5);
		font-size: var(--text-xs);
	}

	.sidebar-health-label {
		font-family: var(--font-family);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-lighter));
	}

	.sidebar-health-value {
		font-family: var(--font-mono);
		color: hsl(var(--fg-data));
	}

	.health-icon-healthy {
		color: hsl(var(--status-success));
	}

	.health-icon-degraded {
		color: hsl(var(--severity-medium));
	}

	.health-icon-unhealthy {
		color: hsl(var(--severity-critical));
	}

	.mono {
		font-family: var(--font-mono);
	}
</style>
