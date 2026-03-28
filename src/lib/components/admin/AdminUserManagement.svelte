<script lang="ts">
	import { api } from '$lib/client';
	import type { AdminAnalyst } from '$lib/client';

	interface Props {
		analysts: AdminAnalyst[];
		loading: boolean;
		error: string;
		onanalystschange: (analysts: AdminAnalyst[]) => void;
		onerror: (error: string) => void;
	}

	let { analysts, loading, error, onanalystschange, onerror }: Props = $props();

	let editingAnalyst = $state<string | null>(null);
	let editRole = $state('');

	let activeAnalysts = $derived(analysts.filter(a => !a.deleted_at));
	let deletedAnalysts = $derived(analysts.filter(a => a.deleted_at));

	function startEditRole(analyst: AdminAnalyst) {
		editingAnalyst = analyst.uuid;
		editRole = analyst.role ?? 'reader';
	}

	function cancelEditRole() {
		editingAnalyst = null;
		editRole = '';
	}

	async function saveRole(uuid: string) {
		onerror('');
		try {
			const updated = await api.admin.analysts.update(uuid, { role: editRole });
			onanalystschange(analysts.map(a => (a.uuid === uuid ? { ...a, ...updated } : a)));
			editingAnalyst = null;
		} catch (err) {
			onerror((err as Error).message);
		}
	}

	async function toggleActive(analyst: AdminAnalyst) {
		onerror('');
		try {
			const updated = await api.admin.analysts.update(analyst.uuid, { active: !analyst.active });
			onanalystschange(analysts.map(a => (a.uuid === analyst.uuid ? { ...a, ...updated } : a)));
		} catch (err) {
			onerror((err as Error).message);
		}
	}

	function formatTimestamp(epoch: number | null): string {
		if (!epoch) return '—';
		const date = new Date(epoch * 1000);
		return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
	}
</script>

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

	{#if error}
		<div class="error-banner" role="alert">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
				<circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
			</svg>
			{error}
		</div>
	{/if}

	{#if loading}
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

	/* ===== Error / Loading ===== */
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
	.loading-state {
		padding: var(--space-8) var(--space-5);
		text-align: center;
		font-size: var(--text-sm);
		color: hsl(var(--fg-muted));
	}
</style>
