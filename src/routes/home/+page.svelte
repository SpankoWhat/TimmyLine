<script lang="ts">
	import type { PageProps } from './$types';
	import { currentCachedIncidents } from '$lib/stores/cacheStore';
	import type { Incident } from '$lib/server/database';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import DashboardStats from '$lib/components/DashboardStats.svelte';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import { joinLobbySocket, leaveLobbySocket, usersInLobby, usersInEachIncident, initializeSocket } from '$lib/stores/collabStore';

	let { data }: PageProps = $props();

	function userSelectedIncident(incident: Incident) {
		goto(`/incident/${incident.uuid}`);
	}

	function editIncident(e: MouseEvent, incident: Incident) {
		e.stopPropagation();
		modalStore.open(createModalConfig('incident', 'edit', incident));
	}

	async function deleteIncident(e: MouseEvent, incident: Incident) {
		e.stopPropagation();
		if (!confirm(`Are you sure you want to delete incident "${incident.title}"?`)) {
			return;
		}

		try {
			const response = await fetch('/api/delete/core/incidents', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ uuid: incident.uuid })
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`Failed to delete: ${error}`);
			}

			console.log(`Successfully deleted incident with uuid: ${incident.uuid}`);
		} catch (error) {
			console.error('Error deleting incident:', error);
			alert(`Failed to delete incident: ${(error as Error).message}`);
		}
	}

	function openNewIncidentModal() {
		modalStore.open(createModalConfig('incident', 'create'));
	}

	function formatTimestamp(epoch: number | null): string {
		if (!epoch) return '—';
		const date = new Date(epoch * 1000);
		return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
	}

	onMount(() => {
		document.title = `Dashboard - TimmyLine`;
		initializeSocket();
		joinLobbySocket();
	});

	onDestroy(() => {
		leaveLobbySocket();
	});
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">Dashboard</h1>
	<div class="page-actions">
		<button class="btn-primary" onclick={openNewIncidentModal}>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
				<line x1="12" y1="5" x2="12" y2="19"></line>
				<line x1="5" y1="12" x2="19" y2="12"></line>
			</svg>
			New Incident
		</button>
	</div>
</header>

<!-- Page Content -->
<div class="page-content">
	<!-- Stat Cards Grid -->
	<DashboardStats />

	<!-- Incidents Data Table -->
	<section>
		<div class="toolbar">
			<span class="toolbar-title">All Incidents</span>
			<div class="toolbar-spacer"></div>
			<span class="toolbar-count">{$currentCachedIncidents.length} total</span>
		</div>
		<div class="table-container">
			{#if $currentCachedIncidents.length > 0}
				<table class="table">
					<thead>
						<tr>
							<th>#</th>
							<th>TITLE</th>
							<th>PRIORITY</th>
							<th>STATUS</th>
							<th>CREATED</th>
							<th>ANALYSTS</th>
							<th>ACTIONS</th>
						</tr>
					</thead>
					<tbody>
						{#each $currentCachedIncidents as incident, i (incident.uuid)}
							{@const activeCount = $usersInEachIncident.get(incident.uuid) ?? 0}
							<tr
								class="table-row-interactive severity-row-{incident.priority}"
								onclick={() => userSelectedIncident(incident)}
								onkeydown={(e) => e.key === 'Enter' && userSelectedIncident(incident)}
								tabindex="0"
								role="button"
							>
								<td class="cell-index">{i + 1}</td>
								<td class="cell-title">{incident.title}</td>
								<td>
									{#if incident.priority === 'critical'}
										<span class="severity-badge severity-critical">CRITICAL</span>
									{:else if incident.priority === 'high'}
										<span class="severity-badge severity-high">HIGH</span>
									{:else if incident.priority === 'medium'}
										<span class="severity-badge severity-medium">MEDIUM</span>
									{:else}
										<span class="severity-badge severity-low">LOW</span>
									{/if}
								</td>
								<td>
									{#if incident.status === 'In Progress'}
										<span class="status-badge status-open">{incident.status}</span>
									{:else if incident.status === 'Post-Mortem'}
										<span class="status-badge status-investigating">{incident.status}</span>
									{:else}
										<span class="status-badge status-closed">{incident.status}</span>
									{/if}
								</td>
								<td class="mono">{formatTimestamp(incident.created_at)}</td>
								<td>
									{#if activeCount > 0}
										<span class="presence-indicator">
											<span class="status-dot status-dot-live"></span>
											{activeCount}
										</span>
									{:else}
										<span class="fg-muted">—</span>
									{/if}
								</td>
								<td>
									<div class="row-actions">
										<button
											class="btn-icon"
											title="Edit incident"
											aria-label="Edit incident"
											onclick={(e) => editIncident(e, incident)}
										>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
												<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
												<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
											</svg>
										</button>
										<button
											class="btn-icon btn-icon-danger"
											title="Delete incident"
											aria-label="Delete incident"
											onclick={(e) => deleteIncident(e, incident)}
										>
											<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
												<polyline points="3 6 5 6 21 6"></polyline>
												<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
											</svg>
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<div class="empty-state">
					<div class="empty-state-icon">📋</div>
					<div class="empty-state-title">No incidents</div>
					<div class="empty-state-description">Create your first incident to get started with timeline tracking.</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- Two-Column Grid: System Health + Lobby -->
	<div class="card-grid two-col">
		<!-- System Health Card -->
		<div class="card">
			<div class="card-header">
				<span class="card-title">System Health</span>
			</div>
			<div class="card-body">
				<div class="info-row">
					<span class="info-label">Database</span>
					<span class="info-value mono">{data.health.database}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Status</span>
					<span class="info-value status-success">{data.health.status}</span>
				</div>
				{#if data.health.error}
					<div class="info-row">
						<span class="info-label">Error</span>
						<span class="info-value status-error">{data.health.error}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Users in Lobby Card -->
		<div class="card">
			<div class="card-header">
				<span class="card-title">Users in Lobby</span>
				<span class="card-count">{$usersInLobby.size}</span>
			</div>
			<div class="card-body">
				{#if $usersInLobby.size > 0}
					{#each $usersInLobby as user (user[0])}
						<div class="info-row">
							<span class="info-label mono">{user[1].analystUUID.substring(0, 8)}</span>
							<span class="info-value">
								<span class="presence-indicator">
									<span class="status-dot status-dot-live"></span>
									{user[1].analystName}
								</span>
							</span>
						</div>
					{/each}
				{:else}
					<div class="empty-lobby">
						<span class="fg-muted">No users currently in the lobby.</span>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	/* ============================================================
	   Page Header — SOP §11.1
	   ============================================================ */
	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-6);
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		flex-shrink: 0;
	}
	.page-title {
		font-size: var(--text-xl);
		font-weight: var(--font-bold);
		color: hsl(var(--fg-default));
		letter-spacing: var(--tracking-tight);
		margin: 0;
	}
	.page-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	/* ============================================================
	   Page Content — SOP §11.1
	   ============================================================ */
	.page-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding: var(--space-4) var(--space-6);
		overflow-y: auto;
	}

	/* ============================================================
	   Primary Button — SOP §10.1
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
		text-decoration: none;
		white-space: nowrap;
	}
	.btn-primary:hover {
		background: hsl(var(--brand-600));
	}
	.btn-primary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	/* ============================================================
	   Toolbar — SOP §10.15
	   ============================================================ */
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-surface-200));
		border-bottom: var(--border-width) solid hsl(var(--border-default));
		min-height: 40px;
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}
	.toolbar-title {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-light));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}
	.toolbar-spacer {
		flex: 1;
	}
	.toolbar-count {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	/* ============================================================
	   Table — SOP §10.8
	   ============================================================ */
	.table-container {
		width: 100%;
		overflow-x: auto;
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: 0 0 var(--radius-lg) var(--radius-lg);
		border-top: none;
	}
	.table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	.table th {
		position: sticky;
		top: 0;
		z-index: var(--z-table-sticky);
		text-align: left;
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-family);
		font-weight: var(--font-semibold);
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: hsl(var(--fg-lighter));
		background: hsl(var(--bg-surface-300));
		border-bottom: var(--border-width) solid hsl(var(--border-default));
		white-space: nowrap;
		user-select: none;
	}
	.table td {
		padding: var(--space-2) var(--space-3);
		font-family: var(--font-mono);
		color: hsl(var(--fg-data));
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 300px;
	}
	.table tr:last-child td {
		border-bottom: none;
	}
	.table tr:hover td {
		background: hsl(var(--bg-surface-200));
	}

	/* Interactive rows */
	.table-row-interactive {
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.table-row-interactive:focus-visible td {
		background: hsl(var(--bg-selection));
		outline: none;
	}

	/* Severity row left-border indicator — SOP §16.3 */
	.severity-row-critical td:first-child {
		border-left: var(--border-width-thick) solid hsl(var(--severity-critical));
	}
	.severity-row-high td:first-child {
		border-left: var(--border-width-thick) solid hsl(var(--severity-high));
	}
	.severity-row-medium td:first-child {
		border-left: var(--border-width-thick) solid hsl(var(--severity-medium));
	}
	.severity-row-low td:first-child {
		border-left: var(--border-width-thick) solid hsl(var(--severity-low));
	}

	/* Cell overrides */
	.cell-index {
		font-variant-numeric: tabular-nums;
		color: hsl(var(--fg-lighter));
		width: 48px;
	}
	.cell-title {
		font-family: var(--font-family);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-default));
		max-width: 360px;
	}

	/* ============================================================
	   Severity Badge — SOP §16.2
	   ============================================================ */
	.severity-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-0\.5) var(--space-2);
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		font-family: var(--font-family);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		border-radius: var(--radius-sm);
		border: var(--border-width) solid;
		white-space: nowrap;
	}
	.severity-critical {
		color: hsl(var(--severity-critical));
		background: hsl(var(--severity-critical-bg));
		border-color: hsl(var(--severity-critical-border));
	}
	.severity-high {
		color: hsl(var(--severity-high));
		background: hsl(var(--severity-high-bg));
		border-color: hsl(var(--severity-high-border));
	}
	.severity-medium {
		color: hsl(var(--severity-medium));
		background: hsl(var(--severity-medium-bg));
		border-color: hsl(var(--severity-medium-border));
	}
	.severity-low {
		color: hsl(var(--severity-low));
		background: hsl(var(--severity-low-bg));
		border-color: hsl(var(--severity-low-border));
	}

	/* ============================================================
	   Status Badge
	   ============================================================ */
	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: var(--space-0\.5) var(--space-2);
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		font-family: var(--font-family);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		border-radius: var(--radius-sm);
		border: var(--border-width) solid;
		white-space: nowrap;
	}
	.status-open {
		color: hsl(var(--status-open));
		background: hsl(var(--status-open) / 0.12);
		border-color: hsl(var(--status-open) / 0.3);
	}
	.status-investigating {
		color: hsl(var(--status-investigating));
		background: hsl(var(--status-investigating) / 0.12);
		border-color: hsl(var(--status-investigating) / 0.3);
	}
	.status-closed {
		color: hsl(var(--status-closed));
		background: hsl(var(--status-closed) / 0.12);
		border-color: hsl(var(--status-closed) / 0.3);
	}

	/* ============================================================
	   Presence Indicator — SOP §18.1
	   ============================================================ */
	.presence-indicator {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1\.5);
		font-family: var(--font-mono);
		font-size: var(--text-sm);
		color: hsl(var(--fg-data));
	}
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}
	.status-dot-live {
		background: hsl(var(--success-default));
		box-shadow: 0 0 4px hsl(var(--success-default) / 0.5);
		animation: pulse-live 2s ease-in-out infinite;
	}
	@keyframes pulse-live {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	/* Muted text helper */
	.fg-muted {
		color: hsl(var(--fg-muted));
	}

	/* Mono helper */
	.mono {
		font-family: var(--font-mono);
		letter-spacing: var(--tracking-mono);
	}

	/* ============================================================
	   Icon Button — SOP §10.1
	   ============================================================ */
	.btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		padding: 0;
		color: hsl(var(--fg-lighter));
		background: transparent;
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.btn-icon:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}
	.btn-icon:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}
	.btn-icon-danger:hover {
		color: hsl(var(--destructive-default));
		background: hsl(var(--destructive-default) / 0.12);
	}
	.row-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	/* ============================================================
	   Card Grid — SOP §11.2
	   ============================================================ */
	.card-grid {
		display: grid;
		gap: var(--space-4);
	}
	.card-grid.two-col {
		grid-template-columns: 1fr 1fr;
	}

	/* ============================================================
	   Card — SOP §10.2
	   ============================================================ */
	.card {
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		display: flex;
		flex-direction: column;
	}
	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-4);
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
	}
	.card-title {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-light));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}
	.card-count {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		background: hsl(var(--bg-surface-300));
		padding: var(--space-0\.5) var(--space-1\.5);
		border-radius: var(--radius-sm);
	}
	.card-body {
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-0\.5);
	}

	/* ============================================================
	   Info Rows (inside cards)
	   ============================================================ */
	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-2) 0;
		font-size: var(--text-sm);
	}
	.info-row:not(:last-child) {
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
	}
	.info-label {
		color: hsl(var(--fg-lighter));
		font-family: var(--font-family);
		font-weight: var(--font-medium);
	}
	.info-value {
		color: hsl(var(--fg-default));
		font-weight: var(--font-medium);
	}
	.info-value.status-success {
		color: hsl(var(--success-default));
	}
	.info-value.status-error {
		color: hsl(var(--destructive-default));
	}

	/* ============================================================
	   Empty States — SOP §10.12
	   ============================================================ */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: var(--space-10) var(--space-6);
		color: hsl(var(--fg-lighter));
	}
	.empty-state-icon {
		font-size: var(--text-3xl);
		margin-bottom: var(--space-3);
		opacity: 0.4;
	}
	.empty-state-title {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-light));
		margin-bottom: var(--space-2);
	}
	.empty-state-description {
		font-size: var(--text-sm);
		color: hsl(var(--fg-lighter));
		max-width: 400px;
		line-height: var(--leading-normal);
	}
	.empty-lobby {
		padding: var(--space-4) 0;
		text-align: center;
	}

	/* ============================================================
	   Reduced Motion — SOP §9.4
	   ============================================================ */
	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>