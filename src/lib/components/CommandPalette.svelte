<script lang="ts">
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { currentCachedIncidents, currentSelectedIncident } from '$lib/stores/cacheStore';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import type { EntityType } from '$lib/modals/types';

	// ---------------------------------------------------------------------------
	// Types
	// ---------------------------------------------------------------------------

	interface CommandItem {
		id: string;
		label: string;
		description?: string;
		icon?: string;
		shortcut?: string;
		category: string;
		action: () => void;
		/** When true the item only shows if an incident is selected */
		requiresIncident?: boolean;
	}

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	let isOpen = $state(false);
	let query = $state('');
	let highlightedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state(undefined);

	// ---------------------------------------------------------------------------
	// Static command definitions
	// ---------------------------------------------------------------------------

	const navigationItems: CommandItem[] = [
		{
			id: 'nav-dashboard',
			label: 'Go to Dashboard',
			description: 'View the main dashboard',
			category: 'Navigation',
			shortcut: '',
			action: () => { close(); goto('/home'); }
		},
		{
			id: 'nav-incidents',
			label: 'Go to Incidents',
			description: 'Browse all incidents',
			category: 'Navigation',
			action: () => { close(); goto('/home'); }
		},
		{
			id: 'nav-settings',
			label: 'Go to Settings',
			description: 'Application settings',
			category: 'Navigation',
			action: () => { close(); goto('/settings'); }
		}
	];

	const actionItems: CommandItem[] = [
		{
			id: 'action-new-incident',
			label: 'Create New Incident',
			description: 'Open the incident creation form',
			category: 'Actions',
			action: () => {
				close();
				modalStore.open(createModalConfig('incident', 'create'));
			}
		},
		{
			id: 'action-new-event',
			label: 'Create New Event',
			description: 'Add a timeline event to the current incident',
			category: 'Actions',
			requiresIncident: true,
			action: () => {
				close();
				modalStore.open(createModalConfig('timeline_event', 'create'));
			}
		},
		{
			id: 'action-new-action',
			label: 'Create New Action',
			description: 'Add an investigation action',
			category: 'Actions',
			requiresIncident: true,
			action: () => {
				close();
				modalStore.open(createModalConfig('investigation_action', 'create'));
			}
		},
		{
			id: 'action-new-entity',
			label: 'Create New Entity',
			description: 'Add an entity to the current incident',
			category: 'Actions',
			requiresIncident: true,
			action: () => {
				close();
				modalStore.open(createModalConfig('entity', 'create'));
			}
		},
		{
			id: 'action-new-annotation',
			label: 'Create New Annotation',
			description: 'Add an annotation',
			category: 'Actions',
			requiresIncident: true,
			action: () => {
				close();
				modalStore.open(createModalConfig('annotation', 'create'));
			}
		}
	];

	// ---------------------------------------------------------------------------
	// Dynamic items – recent incidents from store
	// ---------------------------------------------------------------------------

	function getRecentIncidentItems(): CommandItem[] {
		const incidents = get(currentCachedIncidents);
		return incidents.slice(0, 5).map((inc) => ({
			id: `incident-${inc.uuid}`,
			label: inc.title,
			category: 'Recent Incidents',
			action: () => {
				close();
				goto(`/incident/${inc.uuid}`);
			}
		}));
	}

	// ---------------------------------------------------------------------------
	// Build the full list, respecting incident context
	// ---------------------------------------------------------------------------

	function getAllItems(): CommandItem[] {
		const hasIncident = get(currentSelectedIncident) !== null;
		const actions = actionItems.filter((item) => !item.requiresIncident || hasIncident);
		return [...navigationItems, ...actions, ...getRecentIncidentItems()];
	}

	// ---------------------------------------------------------------------------
	// Derived – filtered & grouped results
	// ---------------------------------------------------------------------------

	let filteredItems = $derived.by(() => {
		const all = getAllItems();
		if (!query.trim()) return all;
		const q = query.toLowerCase();
		return all.filter((item) => item.label.toLowerCase().includes(q));
	});

	/** Group filtered items by category, preserving order */
	let groupedResults = $derived.by(() => {
		const groups: { label: string; items: CommandItem[] }[] = [];
		const seen = new Set<string>();
		for (const item of filteredItems) {
			if (!seen.has(item.category)) {
				seen.add(item.category);
				groups.push({ label: item.category, items: [] });
			}
			groups.find((g) => g.label === item.category)!.items.push(item);
		}
		return groups;
	});

	// ---------------------------------------------------------------------------
	// Open / Close helpers
	// ---------------------------------------------------------------------------

	function open() {
		isOpen = true;
		query = '';
		highlightedIndex = 0;
	}

	function close() {
		isOpen = false;
		query = '';
		highlightedIndex = 0;
	}

	function selectHighlighted() {
		const item = filteredItems[highlightedIndex];
		if (item) item.action();
	}

	// ---------------------------------------------------------------------------
	// Keyboard handling inside the palette
	// ---------------------------------------------------------------------------

	function handlePaletteKeydown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				highlightedIndex = (highlightedIndex + 1) % filteredItems.length;
				scrollToHighlighted();
				break;
			case 'ArrowUp':
				e.preventDefault();
				highlightedIndex = (highlightedIndex - 1 + filteredItems.length) % filteredItems.length;
				scrollToHighlighted();
				break;
			case 'Enter':
				e.preventDefault();
				selectHighlighted();
				break;
			case 'Escape':
				e.preventDefault();
				close();
				break;
		}
	}

	function scrollToHighlighted() {
		// Tick to let DOM update, then scroll into view
		requestAnimationFrame(() => {
			const el = document.querySelector('.command-item.highlighted');
			if (el) el.scrollIntoView({ block: 'nearest' });
		});
	}

	// ---------------------------------------------------------------------------
	// Backdrop click
	// ---------------------------------------------------------------------------

	function handleBackdropClick(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('command-backdrop')) {
			close();
		}
	}

	// ---------------------------------------------------------------------------
	// Effects – global listeners
	// ---------------------------------------------------------------------------

	$effect(() => {
		function handleGlobalKeydown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
				e.preventDefault();
				if (isOpen) {
					close();
				} else {
					open();
				}
			}
		}

		function handleCustomOpen() {
			if (!isOpen) open();
		}

		document.addEventListener('keydown', handleGlobalKeydown);
		document.addEventListener('open-command-palette', handleCustomOpen);

		return () => {
			document.removeEventListener('keydown', handleGlobalKeydown);
			document.removeEventListener('open-command-palette', handleCustomOpen);
		};
	});

	// Auto-focus the input when opening
	$effect(() => {
		if (isOpen && inputEl) {
			// Micro-delay so the element is mounted and visible
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	// Reset highlight when query changes
	$effect(() => {
		// Read query to subscribe
		query;
		highlightedIndex = 0;
	});

	// Flat index helper – convert group-based render order to flat index for highlighting
	function flatIndex(groupIdx: number, itemIdx: number): number {
		let idx = 0;
		for (let g = 0; g < groupIdx; g++) {
			idx += groupedResults[g].items.length;
		}
		return idx + itemIdx;
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="command-backdrop"
		onmousedown={handleBackdropClick}
		onkeydown={handlePaletteKeydown}
	>
		<div class="command-palette" role="dialog" aria-label="Command palette">
			<!-- Search input -->
			<div class="command-input-wrapper">
				<svg class="command-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="11" cy="11" r="8" />
					<line x1="21" y1="21" x2="16.65" y2="16.65" />
				</svg>
				<input
					bind:this={inputEl}
					class="command-input"
					type="text"
					placeholder="Search commands…"
					bind:value={query}
					autocomplete="off"
					spellcheck="false"
				/>
				<kbd class="command-esc-hint">Esc</kbd>
			</div>

			<!-- Results -->
			<div class="command-results">
				{#if filteredItems.length === 0}
					<div class="command-empty">No results found</div>
				{:else}
					{#each groupedResults as group, gIdx (group.label)}
						<div class="command-group-label">{group.label}</div>
						{#each group.items as item, iIdx (item.id)}
							{@const idx = flatIndex(gIdx, iIdx)}
							<button
								class="command-item"
								class:highlighted={idx === highlightedIndex}
								onmouseenter={() => (highlightedIndex = idx)}
								onclick={() => item.action()}
								type="button"
							>
								{#if item.icon}
									<span class="command-item-icon">{@html item.icon}</span>
								{/if}
								<span class="command-item-label">
									{item.label}
									{#if item.description}
										<span class="command-item-desc">{item.description}</span>
									{/if}
								</span>
								{#if item.shortcut}
									<kbd class="command-item-shortcut">{item.shortcut}</kbd>
								{/if}
							</button>
						{/each}
					{/each}
				{/if}
			</div>

			<!-- Footer hints -->
			<div class="command-footer">
				<span><kbd>↑↓</kbd> navigate</span>
				<span><kbd>↵</kbd> select</span>
				<span><kbd>esc</kbd> close</span>
			</div>
		</div>
	</div>
{/if}

<style>
	/* ===== BACKDROP ===== */
	.command-backdrop {
		position: fixed;
		inset: 0;
		background: hsl(0 0% 0% / 0.5);
		backdrop-filter: blur(4px);
		z-index: var(--z-command);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 20vh;
	}

	/* ===== PALETTE CONTAINER ===== */
	.command-palette {
		background: hsl(var(--bg-command));
		border: var(--border-width) solid hsl(var(--border-overlay));
		border-radius: var(--radius-xl);
		width: 560px;
		max-height: 400px;
		display: flex;
		flex-direction: column;
		box-shadow: var(--shadow-overlay);
		overflow: hidden;
	}

	/* ===== INPUT WRAPPER ===== */
	.command-input-wrapper {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
	}

	.command-search-icon {
		width: var(--icon-md);
		height: var(--icon-md);
		color: hsl(var(--fg-lighter));
		flex-shrink: 0;
	}

	.command-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		font-family: var(--font-mono);
		font-size: var(--text-base);
		color: hsl(var(--fg-default));
	}

	.command-input::placeholder {
		color: hsl(var(--fg-lighter));
	}

	.command-esc-hint {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-muted));
		padding: var(--space-0\.5) var(--space-1);
		background: hsl(var(--bg-surface-300));
		border-radius: var(--radius-xs);
		border: var(--border-width) solid hsl(var(--border-default));
	}

	/* ===== RESULTS ===== */
	.command-results {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-1);
	}

	.command-empty {
		padding: var(--space-4) var(--space-3);
		text-align: center;
		font-size: var(--text-sm);
		color: hsl(var(--fg-lighter));
	}

	.command-group-label {
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: hsl(var(--fg-muted));
		padding: var(--space-2) var(--space-3) var(--space-1);
	}

	/* ===== RESULT ITEMS ===== */
	.command-item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		width: 100%;
		text-align: left;
		background: none;
		border: none;
		font-family: inherit;
	}

	.command-item:hover,
	.command-item.highlighted {
		background: hsl(var(--bg-overlay-hover));
		color: hsl(var(--fg-default));
	}

	.command-item-icon {
		width: var(--icon-md);
		height: var(--icon-md);
		color: hsl(var(--fg-lighter));
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.command-item-label {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-0\.5);
		min-width: 0;
	}

	.command-item-desc {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.command-item-shortcut {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-muted));
		padding: var(--space-0\.5) var(--space-1);
		background: hsl(var(--bg-surface-300));
		border-radius: var(--radius-xs);
		border: var(--border-width) solid hsl(var(--border-default));
	}

	/* ===== FOOTER ===== */
	.command-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-4);
		border-top: var(--border-width) solid hsl(var(--border-muted));
		font-size: var(--text-xs);
		color: hsl(var(--fg-muted));
	}

	.command-footer kbd {
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		padding: var(--space-0\.5) var(--space-1);
		background: hsl(var(--bg-surface-300));
		border-radius: var(--radius-xs);
		border: var(--border-width) solid hsl(var(--border-default));
		margin-right: var(--space-1);
	}
</style>
