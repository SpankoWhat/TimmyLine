<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { PageProps } from './$types';

	// Store Imports
	import {
		currentSelectedIncident,
		currentCachedTimeline,
		initializeAllCaches,
		showDeletedItems,
		clearHighlights
	} from '$lib/stores/cacheStore.js';
	import { joinIncidentSocket, leaveIncidentSocket } from '$lib/stores/collabStore.js';
	import type { Incident } from '$lib/server/database';

	// Component Imports
	import TimeLineRow from '$lib/components/TimelineRow.svelte';
	import IncidentStats from '$lib/components/IncidentStats.svelte';
	import ActiveUsersIndicator from '$lib/components/ActiveUsersIndicator.svelte';
	import EntitiesAnnotationsPanel from '$lib/components/EntitiesAnnotationsPanel.svelte';
	import FieldSelectorPanel from '$lib/components/FieldSelectorPanel.svelte';

	// Config & Utils
	import { displayFieldsConfig } from '$lib/config/displayFieldsConfig';
	import type { DisplayField } from '$lib/config/displayFieldsConfig';
	import { loadFieldPreferences, clearFieldPreferences } from '$lib/utils/fieldUtils';

	// Modal System
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';

	let { data }: PageProps = $props();

	// Field states — starts with defaults, hydrated from localStorage in onMount
	let fieldStates = $state<{
		event: DisplayField[];
		action: DisplayField[];
	}>({
		event: displayFieldsConfig.event.map((f) => ({ ...f })),
		action: displayFieldsConfig.action.map((f) => ({ ...f }))
	});

	let showFieldSelector = $state(false);
	let showEntitiesPanel = $state(false);
	let searchQuery = $state('');

	// Local filtered timeline — filters $currentCachedTimeline without touching the store
	const filteredTimeline = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		const items = $currentCachedTimeline;
		if (!query) return items;

		return items.filter((item) => {
			const data = item.data;
			// Search all string values on the data object
			return Object.values(data).some((val) => {
				if (val == null) return false;
				if (typeof val === 'string') return val.toLowerCase().includes(query);
				if (typeof val === 'number') return String(val).includes(query);
				return false;
			});
		});
	});

	// Compute filtered field configs based on field states (for passing to TimelineRow)
	const filteredDisplayFieldsConfig = $derived({
		event: [...fieldStates.event].sort((a, b) => a.order - b.order),
		action: [...fieldStates.action].sort((a, b) => a.order - b.order)
	});

	function resetFieldSelection() {
		clearFieldPreferences('event');
		clearFieldPreferences('action');
		fieldStates.event = displayFieldsConfig.event.map((f) => ({ ...f }));
		fieldStates.action = displayFieldsConfig.action.map((f) => ({ ...f }));
	}

	// Toolbar Actions
	function createEvent() {
		modalStore.open(createModalConfig('timeline_event', 'create'));
	}
	function createAction() {
		modalStore.open(createModalConfig('investigation_action', 'create'));
	}
	function createEntity() {
		modalStore.open(createModalConfig('entity', 'create'));
	}
	function createAnnotation() {
		modalStore.open(createModalConfig('annotation', 'create'));
	}

	function toggleShowDeleted() {
		showDeletedItems.update((val) => !val);
	}

	function toggleEntitiesPanel() {
		showEntitiesPanel = !showEntitiesPanel;
		if (!showEntitiesPanel) {
			clearHighlights();
		}
	}

	// Severity badge class helper
	function severityClass(priority: string | undefined): string {
		switch (priority) {
			case 'critical':
				return 'severity-critical';
			case 'high':
				return 'severity-high';
			case 'medium':
				return 'severity-medium';
			case 'low':
				return 'severity-low';
			default:
				return 'severity-info';
		}
	}

	// Status display class helper
	function statusClass(status: string | undefined): string {
		switch (status) {
			case 'In Progress':
				return 'status-in-progress';
			case 'Post-Mortem':
				return 'status-post-mortem';
			case 'Closed':
				return 'status-closed';
			default:
				return '';
		}
	}

	onMount(() => {
		// Hydrate field preferences from localStorage (client-only)
		fieldStates.event = loadFieldPreferences('event', displayFieldsConfig.event);
		fieldStates.action = loadFieldPreferences('action', displayFieldsConfig.action);

		let incidentObj = data.incident as Incident;
		if (!incidentObj) {
			console.warn('No incident data found from server for incident uuid:', incidentObj);
			return;
		}

		currentSelectedIncident.set(incidentObj);
		initializeAllCaches();

		document.title = `Incident - ${$currentSelectedIncident?.title}`;
		joinIncidentSocket();
	});

	onDestroy(() => {
		$currentSelectedIncident = null;
		leaveIncidentSocket();
		clearHighlights();
	});
</script>

<!-- Page Header -->
<header class="page-header">
	<div class="page-header-left">
		<h1 class="page-title">{$currentSelectedIncident?.title ?? 'Loading...'}</h1>
		<div class="incident-meta">
			{#if $currentSelectedIncident}
				<span class="severity-badge {severityClass($currentSelectedIncident.priority)}">
					{$currentSelectedIncident.priority}
				</span>
				<span class="status-badge {statusClass($currentSelectedIncident.status)}">
					{$currentSelectedIncident.status}
				</span>
			{/if}
			<ActiveUsersIndicator />
		</div>
	</div>
	<div class="page-header-right">
		<IncidentStats />
	</div>
</header>

<!-- Page Content -->
<div class="page-content">
	<!-- Toolbar above timeline -->
	<div class="toolbar">
		<div class="toolbar-group">
			<button class="btn-primary btn-sm" onclick={createEvent}>+ Event</button>
			<button class="btn-secondary btn-sm" onclick={createAction}>+ Action</button>
			<button class="btn-secondary btn-sm" onclick={createEntity}>+ Entity</button>
			<button class="btn-secondary btn-sm" onclick={createAnnotation}>+ Annotation</button>
		</div>
		<div class="toolbar-separator"></div>
		<div class="toolbar-group search-group">
			<input
				class="search-input"
				type="text"
				placeholder="Search timeline..."
				bind:value={searchQuery}
			/>
			{#if searchQuery}
				<button class="btn-icon search-clear" onclick={() => (searchQuery = '')} title="Clear search">
					<svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
					</svg>
				</button>
				<span class="search-count">{filteredTimeline.length}/{$currentCachedTimeline.length}</span>
			{/if}
		</div>
		<div class="toolbar-separator"></div>
		<div class="toolbar-group">
			<button class="btn-ghost btn-sm" onclick={toggleShowDeleted}>
				{$showDeletedItems ? 'Hide' : 'Show'} Deleted
			</button>
		</div>
		<div class="toolbar-spacer"></div>
		<div class="toolbar-group">
			<button
				class="btn-icon"
				class:active={showEntitiesPanel}
				onclick={toggleEntitiesPanel}
				title="Entities & Annotations Panel"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M8 1L15 8L8 15L1 8L8 1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
				</svg>
			</button>
			<button
				class="btn-icon"
				class:active={showFieldSelector}
				onclick={() => (showFieldSelector = !showFieldSelector)}
				title="Configure visible fields"
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path d="M6.5 1.5H2.5C1.95 1.5 1.5 1.95 1.5 2.5V6.5C1.5 7.05 1.95 7.5 2.5 7.5H6.5C7.05 7.5 7.5 7.05 7.5 6.5V2.5C7.5 1.95 7.05 1.5 6.5 1.5Z" stroke="currentColor" stroke-width="1.2" />
					<path d="M13.5 1.5H9.5C8.95 1.5 8.5 1.95 8.5 2.5V6.5C8.5 7.05 8.95 7.5 9.5 7.5H13.5C14.05 7.5 14.5 7.05 14.5 6.5V2.5C14.5 1.95 14.05 1.5 13.5 1.5Z" stroke="currentColor" stroke-width="1.2" />
					<path d="M6.5 8.5H2.5C1.95 8.5 1.5 8.95 1.5 9.5V13.5C1.5 14.05 1.95 14.5 2.5 14.5H6.5C7.05 14.5 7.5 14.05 7.5 13.5V9.5C7.5 8.95 7.05 8.5 6.5 8.5Z" stroke="currentColor" stroke-width="1.2" />
					<path d="M13.5 8.5H9.5C8.95 8.5 8.5 8.95 8.5 9.5V13.5C8.5 14.05 8.95 14.5 9.5 14.5H13.5C14.05 14.5 14.5 14.05 14.5 13.5V9.5C14.5 8.95 14.05 8.5 13.5 8.5Z" stroke="currentColor" stroke-width="1.2" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Main content area -->
	<div class="timeline-content">
		<div class="timeline-list-wrapper">
			{#if !$currentSelectedIncident?.uuid}
				<div class="empty-state">
					<span class="empty-state-icon">⚠</span>
					<div class="empty-state-title">No incident selected</div>
					<div class="empty-state-description">Select an active incident to view timeline events.</div>
				</div>
			{:else if filteredTimeline.length === 0 && searchQuery.trim()}
				<div class="empty-state">
					<span class="empty-state-icon">🔍</span>
					<div class="empty-state-title">No results for "{searchQuery.trim()}"</div>
					<div class="empty-state-description">
						No timeline items matched your search. Try a different query or <button class="btn-ghost btn-sm" onclick={() => (searchQuery = '')}>clear the search</button>.
					</div>
				</div>
			{:else if $currentCachedTimeline.length === 0}
				<div class="empty-state">
					<span class="empty-state-icon">📊</span>
					<div class="empty-state-title">No timeline data found</div>
					<div class="empty-state-description">
						No timeline events or investigation actions found for this incident. Use the toolbar above to add events, actions, entities, or annotations.
					</div>
				</div>
			{:else}
				<div class="timeline-list">
					{#each filteredTimeline as item (item.uuid)}
						<TimeLineRow {item} displayFieldsConfig={filteredDisplayFieldsConfig} />
					{/each}
				</div>
			{/if}
		</div>

		<!-- Side panel (entities/annotations) -->
		{#if showEntitiesPanel}
			<aside class="side-panel">
				<EntitiesAnnotationsPanel />
			</aside>
		{/if}
	</div>

	<!-- Field selector overlay -->
	{#if showFieldSelector}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="field-selector-overlay" onclick={() => (showFieldSelector = false)} onkeydown={(e) => e.key === 'Escape' && (showFieldSelector = false)}>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="field-selector-dropdown" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
				<div class="field-selector-panels">
					<FieldSelectorPanel
						title="Event Fields"
						type="event"
						timelineItems={$currentCachedTimeline}
						bind:fields={fieldStates.event}
					/>
					<FieldSelectorPanel
						title="Action Fields"
						type="action"
						timelineItems={$currentCachedTimeline}
						bind:fields={fieldStates.action}
					/>
				</div>
				<button class="btn-secondary btn-sm reset-btn" onclick={resetFieldSelection}>
					Reset to Default
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	/* ===== Page Header (SOP §11.1) ===== */
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

	.page-header-left {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.page-header-right {
		display: flex;
		align-items: center;
	}

	.page-title {
		font-size: var(--text-xl);
		font-weight: var(--font-bold);
		color: hsl(var(--fg-default));
		letter-spacing: var(--tracking-tight);
		margin: 0;
	}

	.incident-meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	/* ===== Severity Badge (SOP §16.2) ===== */
	.severity-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-0\.5) var(--space-2);
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
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

	.severity-info {
		color: hsl(var(--severity-info));
		background: hsl(var(--severity-info-bg));
		border-color: hsl(var(--severity-info-border));
	}

	/* ===== Status Badge (SOP §16.4) ===== */
	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: var(--space-0\.5) var(--space-2);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		letter-spacing: var(--tracking-wide);
		border-radius: var(--radius-sm);
		border: var(--border-width) solid;
		white-space: nowrap;
	}

	.status-in-progress {
		color: hsl(var(--status-open));
		background: hsl(var(--status-open) / 0.12);
		border-color: hsl(var(--status-open) / 0.3);
	}

	.status-post-mortem {
		color: hsl(var(--status-investigating));
		background: hsl(var(--status-investigating) / 0.12);
		border-color: hsl(var(--status-investigating) / 0.3);
	}

	.status-closed {
		color: hsl(var(--status-closed));
		background: hsl(var(--status-closed) / 0.12);
		border-color: hsl(var(--status-closed) / 0.3);
	}

	/* ===== Page Content (SOP §11.1) ===== */
	.page-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		position: relative;
	}

	/* ===== Toolbar (SOP §10.15) ===== */
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-surface-200));
		border-bottom: var(--border-width) solid hsl(var(--border-default));
		min-height: 40px;
		flex-shrink: 0;
	}

	.toolbar-group {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}

	.toolbar-separator {
		width: var(--border-width);
		height: 20px;
		background: hsl(var(--border-default));
		margin: 0 var(--space-1);
	}

	.toolbar-spacer {
		flex: 1;
	}

	/* ===== Search (toolbar inline) ===== */
	.search-group {
		flex: 1;
		max-width: 360px;
		position: relative;
		gap: var(--space-1\.5);
	}

	.search-icon {
		color: hsl(var(--fg-lighter));
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		min-width: 0;
		padding: var(--space-1) var(--space-2);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-control));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-md);
		transition: var(--transition-colors);
		height: 26px;
	}

	.search-input::placeholder {
		color: hsl(var(--fg-lighter));
	}

	.search-input:focus {
		outline: none;
		border-color: hsl(var(--border-focus));
		box-shadow: 0 0 0 1px hsl(var(--border-focus));
	}

	.search-clear {
		width: 20px;
		height: 20px;
		flex-shrink: 0;
	}

	.search-count {
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		color: hsl(var(--fg-lighter));
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ===== Button Styles (SOP §10.1) ===== */
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

	.btn-primary:hover {
		background: hsl(var(--brand-600));
	}

	.btn-primary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.btn-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		min-height: 32px;
		white-space: nowrap;
	}

	.btn-secondary:hover {
		background: hsl(var(--bg-surface-300));
		border-color: hsl(var(--border-strong));
	}

	.btn-secondary:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-light));
		background: transparent;
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: var(--transition-colors);
		min-height: 32px;
		white-space: nowrap;
	}

	.btn-ghost:hover {
		background: hsl(var(--bg-surface-200));
		color: hsl(var(--fg-default));
	}

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

	.btn-icon.active {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--brand-default));
	}

	/* Small button size (SOP §10.1) */
	.btn-sm {
		padding: var(--space-1) var(--space-2);
		font-size: var(--text-xs);
		min-height: 24px;
	}

	/* ===== Timeline Content ===== */
	.timeline-content {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.timeline-list-wrapper {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-3);
	}

	.timeline-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	/* ===== Side Panel ===== */
	.side-panel {
		width: 360px;
		border-left: var(--border-width) solid hsl(var(--border-default));
		overflow-y: auto;
		flex-shrink: 0;
	}

	/* ===== Empty State (SOP §10.12) ===== */
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

	/* ===== Field Selector Overlay ===== */
	.field-selector-overlay {
		position: absolute;
		inset: 40px 0 0 0;
		z-index: var(--z-dropdown);
		background: hsl(0 0% 0% / 0.3);
		display: flex;
		justify-content: flex-end;
		padding: var(--space-2) var(--space-3);
	}

	.field-selector-dropdown {
		background: hsl(var(--bg-overlay));
		border: var(--border-width) solid hsl(var(--border-overlay));
		border-radius: var(--radius-lg);
		padding: var(--space-4);
		box-shadow: var(--shadow-lg);
		max-width: 95vw;
		min-width: 600px;
		max-height: 80vh;
		overflow-y: auto;
		align-self: flex-start;
	}

	.field-selector-panels {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
		margin-bottom: var(--space-3);
	}

	.reset-btn {
		width: 100%;
	}
</style>