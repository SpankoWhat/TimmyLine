<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';

	let { data }: PageProps = $props();

	type ApiKeyRecord = {
		id: string;
		key_prefix: string;
		name: string;
		role: string;
		analyst_uuid: string;
		last_used_at: number | null;
		expires_at: number | null;
		created_at: number | null;
		revoked_at: number | null;
	};

	let apiKeys = $state<ApiKeyRecord[]>([]);
	let loading = $state(true);
	let error = $state('');

	// New key form
	let newKeyName = $state('');
	let newKeyRole = $state<'read-only' | 'analyst' | 'on-point lead'>('analyst');
	let newKeyExpiry = $state<'never' | '30d' | '90d' | '1y'>('never');
	let creating = $state(false);

	// Newly created key (shown once)
	let newlyCreatedKey = $state<{ key: string; name: string } | null>(null);
	let copied = $state(false);

	async function fetchKeys() {
		loading = true;
		error = '';
		try {
			const res = await fetch('/api/read/core/api_keys');
			if (!res.ok) throw new Error(await res.text());
			apiKeys = await res.json();
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
			const res = await fetch('/api/create/core/api_key', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newKeyName.trim(),
					role: newKeyRole,
					expires_at
				})
			});
			if (!res.ok) throw new Error(await res.text());
			const result = await res.json();
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
			const res = await fetch('/api/delete/core/api_key', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			if (!res.ok) throw new Error(await res.text());
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

	function formatTimestamp(epoch: number | null): string {
		if (!epoch) return '—';
		const date = new Date(epoch * 1000);
		return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
	}

	function formatRelative(epoch: number | null): string {
		if (!epoch) return 'Never';
		const now = Math.floor(Date.now() / 1000);
		const diff = now - epoch;
		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}

	function isExpired(key: ApiKeyRecord): boolean {
		if (!key.expires_at) return false;
		return key.expires_at < Math.floor(Date.now() / 1000);
	}

	let activeKeys = $derived(apiKeys.filter((k) => !k.revoked_at && !isExpired(k)));
	let inactiveKeys = $derived(apiKeys.filter((k) => k.revoked_at || isExpired(k)));

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
							<option value="read-only">Read-only</option>
							<option value="analyst">Analyst</option>
							<option value="on-point lead">On-Point Lead</option>
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
								<tr>
									<td class="cell-name">{key.name}</td>
									<td class="cell-key"><code>{key.key_prefix}…</code></td>
									<td class="cell-role">
										<span class="role-badge" class:role-readonly={key.role === 'read-only'} class:role-analyst={key.role === 'analyst'} class:role-lead={key.role === 'on-point lead'}>
											{key.role}
										</span>
									</td>
									<td class="cell-date mono" title={formatTimestamp(key.created_at)}>{formatRelative(key.created_at)}</td>
									<td class="cell-date mono" title={formatTimestamp(key.last_used_at)}>{formatRelative(key.last_used_at)}</td>
									<td class="cell-date mono" title={formatTimestamp(key.expires_at)}>
										{#if key.expires_at}
											{formatTimestamp(key.expires_at)}
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
								<tr class="row-inactive">
									<td class="cell-name">{key.name}</td>
									<td class="cell-key"><code>{key.key_prefix}…</code></td>
									<td class="cell-role">
										<span class="role-badge role-inactive">{key.role}</span>
									</td>
									<td class="cell-date mono">{formatRelative(key.created_at)}</td>
									<td class="cell-status">
										{#if key.revoked_at}
											<span class="status-revoked">Revoked {formatRelative(key.revoked_at)}</span>
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
	.role-readonly {
		color: hsl(var(--info-default));
		background: hsl(var(--info-200));
	}
	.role-analyst {
		color: hsl(var(--success-default));
		background: hsl(var(--success-200));
	}
	.role-lead {
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
