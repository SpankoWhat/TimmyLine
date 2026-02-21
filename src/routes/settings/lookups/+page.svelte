<script lang="ts">
	import { onMount } from 'svelte';

	// ============================================================================
	// Types
	// ============================================================================

	type LookupEntry = {
		name: string;
		description: string | null;
		deleted_at: number | null;
	};

	type LookupTableConfig = {
		key: string;
		label: string;
		description: string;
	};

	// ============================================================================
	// Lookup table definitions
	// ============================================================================

	const LOOKUP_TABLES: LookupTableConfig[] = [
		{ key: 'event_type', label: 'Event Types', description: 'Categories of timeline events' },
		{ key: 'action_type', label: 'Action Types', description: 'Types of investigation actions' },
		{ key: 'entity_type', label: 'Entity Types', description: 'Types of entities' },
		{ key: 'annotation_type', label: 'Annotation Types', description: 'Types of annotations' },
		{ key: 'relation_type', label: 'Relation Types', description: 'Entity-to-event/action relationships' }
	];

	// ============================================================================
	// State
	// ============================================================================

	let selectedTable = $state<string>(LOOKUP_TABLES[0].key);
	let entries = $state<LookupEntry[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showDeleted = $state(false);

	// Create form
	let newName = $state('');
	let newDescription = $state('');
	let creating = $state(false);

	// Edit state
	let editingEntry = $state<string | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let saving = $state(false);

	// ============================================================================
	// Derived
	// ============================================================================

	let selectedConfig = $derived(LOOKUP_TABLES.find((t) => t.key === selectedTable)!);
	let activeEntries = $derived(entries.filter((e) => !e.deleted_at));
	let deletedEntries = $derived(entries.filter((e) => e.deleted_at !== null));

	// ============================================================================
	// API Functions
	// ============================================================================

	async function fetchEntries() {
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/read/lookup?table=${selectedTable}&include_deleted=true`);
			if (!res.ok) throw new Error(await res.text());
			entries = await res.json();
		} catch (err) {
			error = (err as Error).message;
		} finally {
			loading = false;
		}
	}

	async function createEntry() {
		if (!newName.trim()) return;
		creating = true;
		error = '';
		try {
			const res = await fetch('/api/create/lookup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					table: selectedTable,
					name: newName.trim(),
					description: newDescription.trim()
				})
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to create entry');
			}
			newName = '';
			newDescription = '';
			await fetchEntries();
		} catch (err) {
			error = (err as Error).message;
		} finally {
			creating = false;
		}
	}

	async function saveEdit(originalName: string) {
		if (!editName.trim()) return;
		saving = true;
		error = '';
		try {
			const res = await fetch('/api/update/lookup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					table: selectedTable,
					old_name: originalName,
					name: editName.trim(),
					description: editDescription.trim()
				})
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to update entry');
			}
			editingEntry = null;
			await fetchEntries();
		} catch (err) {
			error = (err as Error).message;
		} finally {
			saving = false;
		}
	}

	async function softDelete(name: string) {
		error = '';
		try {
			const res = await fetch('/api/update/lookup/soft-delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ table: selectedTable, name })
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to delete entry');
			}
			await fetchEntries();
		} catch (err) {
			error = (err as Error).message;
		}
	}

	async function restoreEntry(name: string) {
		error = '';
		try {
			const res = await fetch('/api/update/lookup/restore', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ table: selectedTable, name })
			});
			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Failed to restore entry');
			}
			await fetchEntries();
		} catch (err) {
			error = (err as Error).message;
		}
	}

	function startEdit(entry: LookupEntry) {
		editingEntry = entry.name;
		editName = entry.name;
		editDescription = entry.description ?? '';
	}

	function cancelEdit() {
		editingEntry = null;
		editName = '';
		editDescription = '';
	}

	function formatTimestamp(epoch: number | null): string {
		if (!epoch) return '';
		const date = new Date(epoch * 1000);
		return date.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
	}

	function handleTableChange(key: string) {
		selectedTable = key;
		editingEntry = null;
		fetchEntries();
	}

	onMount(() => {
		document.title = 'Lookup Tables — TimmyLine';
		fetchEntries();
	});
</script>

<!-- Page Header -->
<header class="page-header">
	<div class="page-header-left">
		<h1 class="page-title">Lookup Tables</h1>
	</div>
</header>

<div class="page-content">
	<!-- Table Selector Tabs -->
	<div class="table-tabs" role="tablist" aria-label="Lookup tables">
		{#each LOOKUP_TABLES as table (table.key)}
			<button
				class="table-tab"
				class:active={selectedTable === table.key}
				role="tab"
				aria-selected={selectedTable === table.key}
				onclick={() => handleTableChange(table.key)}
			>
				{table.label}
			</button>
		{/each}
	</div>

	<!-- Selected Table Info -->
	<div class="table-info">
		<h2 class="table-info-title">{selectedConfig.label}</h2>
		<p class="table-info-description">{selectedConfig.description}</p>
	</div>

	<!-- Create New Entry -->
	<div class="create-card">
		<h3 class="card-title">Add Entry</h3>
		<form class="create-form" onsubmit={(e) => { e.preventDefault(); createEntry(); }}>
			<div class="form-row">
				<div class="form-field form-field-name">
					<label class="form-label" for="entry-name">Name</label>
					<input
						id="entry-name"
						type="text"
						class="form-input"
						placeholder="e.g. file_created, malware_analysis"
						bind:value={newName}
						maxlength="50"
						required
					/>
				</div>
				<div class="form-field form-field-description">
					<label class="form-label" for="entry-description">Description</label>
					<input
						id="entry-description"
						type="text"
						class="form-input"
						placeholder="Brief description of this type"
						bind:value={newDescription}
						maxlength="100"
					/>
				</div>
				<button type="submit" class="btn-primary" disabled={creating || !newName.trim()}>
					{#if creating}
						Adding…
					{:else}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Add
					{/if}
				</button>
			</div>
		</form>
	</div>

	<!-- Error -->
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

	<!-- Active Entries Table -->
	{#if loading}
		<div class="loading-state">Loading entries…</div>
	{:else}
		<div class="entries-table-wrapper">
			<div class="toolbar">
				<span class="toolbar-title">Active ({activeEntries.length})</span>
				<div class="toolbar-spacer"></div>
				{#if deletedEntries.length > 0}
					<button
						class="btn-toggle-deleted"
						class:active={showDeleted}
						onclick={() => (showDeleted = !showDeleted)}
						aria-pressed={showDeleted}
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
						</svg>
						{showDeleted ? 'Hide' : 'Show'} Deleted ({deletedEntries.length})
					</button>
				{/if}
			</div>
			{#if activeEntries.length === 0}
				<div class="empty-state">No active entries in this table.</div>
			{:else}
				<table class="entries-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Description</th>
							<th class="col-actions"></th>
						</tr>
					</thead>
					<tbody>
						{#each activeEntries as entry (entry.name)}
							{#if editingEntry === entry.name}
								<tr class="row-editing">
									<td>
										<input
											type="text"
											class="edit-input"
											bind:value={editName}
											maxlength="50"
										/>
									</td>
									<td>
										<input
											type="text"
											class="edit-input"
											bind:value={editDescription}
											maxlength="100"
										/>
									</td>
									<td class="col-actions">
										<div class="action-group">
											<button
												class="btn-action btn-save"
												onclick={() => saveEdit(entry.name)}
												disabled={saving || !editName.trim()}
												title="Save changes"
												aria-label="Save changes"
											>
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
													<polyline points="20 6 9 17 4 12" />
												</svg>
											</button>
											<button
												class="btn-action btn-cancel"
												onclick={cancelEdit}
												title="Cancel editing"
												aria-label="Cancel editing"
											>
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
													<line x1="18" y1="6" x2="6" y2="18" />
													<line x1="6" y1="6" x2="18" y2="18" />
												</svg>
											</button>
										</div>
									</td>
								</tr>
							{:else}
								<tr>
									<td class="cell-name mono">{entry.name}</td>
									<td class="cell-description">{entry.description ?? '—'}</td>
									<td class="col-actions">
										<div class="action-group">
											<button
												class="btn-action btn-edit"
												onclick={() => startEdit(entry)}
												title="Edit entry"
												aria-label="Edit {entry.name}"
											>
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
													<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
													<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
												</svg>
											</button>
											<button
												class="btn-action btn-delete"
												onclick={() => softDelete(entry.name)}
												title="Mark as deleted"
												aria-label="Delete {entry.name}"
											>
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
													<polyline points="3 6 5 6 21 6" />
													<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
												</svg>
											</button>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			{/if}
		</div>

		<!-- Deleted Entries Table -->
		{#if showDeleted && deletedEntries.length > 0}
			<div class="entries-table-wrapper deleted-section">
				<div class="toolbar">
					<span class="toolbar-title">Deleted ({deletedEntries.length})</span>
				</div>
				<table class="entries-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Description</th>
							<th>Deleted At</th>
							<th class="col-actions"></th>
						</tr>
					</thead>
					<tbody>
						{#each deletedEntries as entry (entry.name)}
							<tr class="row-deleted">
								<td class="cell-name mono">{entry.name}</td>
								<td class="cell-description">{entry.description ?? '—'}</td>
								<td class="cell-date mono">{formatTimestamp(entry.deleted_at)}</td>
								<td class="col-actions">
									<button
										class="btn-action btn-restore"
										onclick={() => restoreEntry(entry.name)}
										title="Restore entry"
										aria-label="Restore {entry.name}"
									>
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
											<polyline points="1 4 1 10 7 10" />
											<path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
										</svg>
										<span>Restore</span>
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
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
		padding: var(--space-2) var(--space-6);
		border-bottom: var(--border-width) solid hsl(var(--border-default));
		background: hsl(var(--bg-surface-100));
		min-height: 48px;
	}

	.page-header-left {
		display: flex;
		align-items: center;
		gap: var(--space-3);
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
		gap: var(--space-4);
		padding: var(--space-4) var(--space-6);
		overflow-y: auto;
	}

	/* ============================================================
	   Table Selector Tabs
	   ============================================================ */
	.table-tabs {
		display: flex;
		gap: var(--space-1);
		padding: var(--space-1);
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		overflow-x: auto;
	}

	.table-tab {
		display: inline-flex;
		align-items: center;
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		background: transparent;
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		white-space: nowrap;
	}

	.table-tab:hover {
		background: hsl(var(--bg-surface-200));
		color: hsl(var(--fg-default));
	}

	.table-tab.active {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--brand-default));
		border-color: hsl(var(--border-strong));
	}

	.table-tab:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	/* ============================================================
	   Table Info
	   ============================================================ */
	.table-info {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.table-info-title {
		font-family: var(--font-family);
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		margin: 0;
	}

	.table-info-description {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
		margin: 0;
	}

	/* ============================================================
	   Create Card
	   ============================================================ */
	.create-card {
		padding: var(--space-3) var(--space-4);
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
	}

	.card-title {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		margin: 0 0 var(--space-3) 0;
	}

	.create-form {
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

	.form-field-name {
		flex: 1;
		min-width: 180px;
	}

	.form-field-description {
		flex: 2;
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

	.form-input {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-control));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-md);
		padding: var(--space-1\.5) var(--space-2);
		min-height: 32px;
		transition: var(--transition-colors);
	}

	.form-input:focus {
		border-color: hsl(var(--border-focus));
		outline: none;
		box-shadow: 0 0 0 1px hsl(var(--border-focus));
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
	   Entries Table
	   ============================================================ */
	.entries-table-wrapper {
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.entries-table-wrapper.deleted-section {
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
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-lighter));
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.toolbar-spacer {
		flex: 1;
	}

	.btn-toggle-deleted {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-lighter));
		background: transparent;
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.btn-toggle-deleted:hover {
		color: hsl(var(--fg-default));
		border-color: hsl(var(--border-strong));
		background: hsl(var(--bg-surface-300));
	}

	.btn-toggle-deleted.active {
		color: hsl(var(--brand-default));
		border-color: hsl(var(--brand-500));
		background: hsl(var(--brand-default) / 0.08);
	}

	.btn-toggle-deleted:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.entries-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.entries-table th {
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

	.entries-table td {
		padding: var(--space-2) var(--space-3);
		color: hsl(var(--fg-default));
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		vertical-align: middle;
	}

	.entries-table tr:last-child td {
		border-bottom: none;
	}

	.entries-table tbody tr:hover td {
		background: hsl(var(--bg-surface-200));
	}

	.cell-name {
		font-family: var(--font-mono);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-data));
		letter-spacing: var(--tracking-mono);
	}

	.cell-description {
		font-family: var(--font-family);
		color: hsl(var(--fg-light));
	}

	.cell-date {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.col-actions {
		width: 1%;
		white-space: nowrap;
		text-align: right;
	}

	.mono {
		font-family: var(--font-mono);
		letter-spacing: var(--tracking-mono);
	}

	/* ============================================================
	   Action Buttons
	   ============================================================ */
	.action-group {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-1);
	}

	.btn-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
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

	.btn-action:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.btn-edit:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}

	.btn-delete:hover {
		background: hsl(var(--destructive-300));
		color: hsl(var(--destructive-default));
	}

	.btn-save:hover {
		background: hsl(var(--success-200));
		color: hsl(var(--success-default));
	}

	.btn-save:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-cancel:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}

	.btn-restore {
		width: auto;
		padding: var(--space-1) var(--space-2);
		font-family: var(--font-family);
		font-size: var(--text-xs);
	}

	.btn-restore:hover {
		background: hsl(var(--success-200));
		color: hsl(var(--success-default));
	}

	/* ============================================================
	   Edit Inline Input
	   ============================================================ */
	.edit-input {
		width: 100%;
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-control));
		border: var(--border-width) solid hsl(var(--border-focus));
		border-radius: var(--radius-sm);
		padding: var(--space-1) var(--space-2);
		min-height: 28px;
		transition: var(--transition-colors);
	}

	.edit-input:focus {
		outline: none;
		box-shadow: 0 0 0 1px hsl(var(--border-focus));
	}

	.row-editing td {
		background: hsl(var(--bg-selection));
	}

	/* ============================================================
	   Deleted Row Styles
	   ============================================================ */
	.row-deleted td {
		color: hsl(var(--fg-muted));
	}

	.row-deleted .cell-name {
		text-decoration: line-through;
		color: hsl(var(--fg-lighter));
	}

	.row-deleted .cell-description {
		color: hsl(var(--fg-muted));
	}
</style>
