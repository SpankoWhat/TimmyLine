/*Decommissioned*/
<script lang="ts">
	import { 
		currentSelectedAnalyst,
		currentSelectedIncident,
		currentCachedIncidents,
		analysts,
		initializeAllCaches
	} from '$lib/stores/cacheStore';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import { goto } from '$app/navigation';
	import type { Incident, Analyst } from '$lib/server/database';

	let isExpanded = $state(false);
	let showCreateMenu = $state(false);

	function toggleExpanded() {
		isExpanded = !isExpanded;
		if (!isExpanded) {
			showCreateMenu = false;
		}
	}

	function selectIncident(incident: Incident) {
		currentSelectedIncident.set(incident);
		goto(`/incident/${incident.uuid}`);
	}

	function selectAnalyst(analyst: Analyst) {
		currentSelectedAnalyst.set(analyst);
	}

	function toggleCreateMenu() {
		showCreateMenu = !showCreateMenu;
	}

	async function createEntity(entityType: string) {
		modalStore.open(createModalConfig(entityType as any, 'create'));
		showCreateMenu = false;
	}
</script>

<style>
	.floating-toggle {
		position: fixed;
		top: var(--spacing-lg);
		right: var(--spacing-lg);
		width: 3.5rem;
		height: 3.5rem;
		background: var(--color-bg-secondary);
		border: 2px solid var(--color-accent-warning);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all var(--transition-normal);
		z-index: 1000;
		box-shadow: var(--shadow-md);
	}

	.floating-toggle:hover {
		transform: scale(1.1);
		border-color: var(--color-accent-primary);
	}

	.toggle-icon {
		font-size: var(--font-size-lg);
	}

	.quick-actions-panel {
		position: fixed;
		top: var(--spacing-lg);
		right: var(--spacing-lg);
		width: 300px;
		max-height: calc(100vh - 120px);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-md);
		z-index: 1000;
		overflow: hidden;
		animation: slideIn 0.2s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(50px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-md) var(--spacing-lg);
		background: var(--color-bg-tertiary);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.header-icon {
		font-size: var(--font-size-md);
		color: var(--color-accent-warning);
	}

	.header-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.close-btn {
		width: 1.75rem;
		height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		color: var(--color-accent-error);
		cursor: pointer;
		transition: all var(--transition-fast);
		font-size: var(--font-size-sm);
	}

	.close-btn:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-accent-error);
		transform: scale(1.05);
	}

	.panel-content {
		padding: var(--spacing-lg);
		max-height: calc(100vh - 180px);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.selector-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.selector-label {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.label-icon {
		font-size: var(--font-size-sm);
	}

	.selector-input {
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		transition: all var(--transition-fast);
		cursor: pointer;
	}

	.selector-input:hover {
		border-color: var(--color-accent-primary);
	}

	.selector-input:focus {
		outline: none;
		border-color: var(--color-accent-primary);
	}

	.divider {
		height: 1px;
		background: var(--color-border-subtle);
		margin: var(--spacing-sm) 0;
	}

	.dropdown-wrapper {
		position: relative;
	}

	.create-main-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-accent-success);
		border-radius: var(--border-radius-sm);
		color: var(--color-accent-success);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.create-main-btn:hover {
		background: rgba(52, 211, 153, 0.1);
		border-color: var(--color-accent-success);
	}

	.arrow {
		margin-left: auto;
		font-size: var(--font-size-xs);
	}

	.create-dropdown {
		margin-top: var(--spacing-xs);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		padding: var(--spacing-sm);
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.create-option {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--border-radius-sm);
		color: var(--color-text-primary);
		font-size: var(--font-size-xs);
		cursor: pointer;
		transition: all var(--transition-fast);
		text-align: left;
	}

	.create-option:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-border-medium);
		transform: translateX(4px);
	}

	.option-icon {
		font-size: var(--font-size-sm);
	}

	.quick-stats {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--border-radius-sm);
	}

	.stat-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		text-align: center;
	}

	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-accent-success);
	}
</style>

<!-- Floating Action Button (when collapsed) -->
{#if !isExpanded}
	<button class="floating-toggle" onclick={toggleExpanded} title="Quick Actions">
		<span class="toggle-icon">⚡</span>
	</button>
{/if}

<!-- Expanded Quick Actions Panel -->
{#if isExpanded}
	<div class="quick-actions-panel">
		<!-- Header -->
		<div class="panel-header">
			<div class="header-content">
				<span class="header-icon">⚡</span>
				<h3 class="header-title">Quick Actions</h3>
			</div>
			<button class="close-btn" onclick={toggleExpanded} title="Close">✕</button>
		</div>

		<!-- Content -->
		<div class="panel-content">
			<!-- Analyst Selector -->
			<div class="selector-group">
				<div class="selector-label">
					<span class="label-icon">👤</span>
					<span>Active Analyst</span>
				</div>
				<select 
					class="selector-input"
					value={$currentSelectedAnalyst?.uuid}
					onchange={(e) => {
						const analyst = $analysts.find(a => a.uuid === e.currentTarget.value);
						if (analyst) selectAnalyst(analyst);
					}}>
					{#each $analysts as analyst}
						<option value={analyst.uuid}>{analyst.full_name}</option>
					{/each}
				</select>
			</div>

			<!-- Incident Selector -->
			<div class="selector-group">
				<div class="selector-label">
					<span class="label-icon">🔥</span>
					<span>Active Incident</span>
				</div>
				<select 
					class="selector-input"
					value={$currentSelectedIncident?.uuid}
					onchange={(e) => {
						const incident = $currentCachedIncidents.find(i => i.uuid === e.currentTarget.value);
						if (incident) selectIncident(incident);
					}}>
					<option value="">-- Select Incident --</option>
					{#each $currentCachedIncidents as incident}
						<option value={incident.uuid}>{incident.title}</option>
					{/each}
				</select>
			</div>

			<!-- Divider -->
			<div class="divider"></div>

			<!-- Create New Button -->
			<div class="dropdown-wrapper">
				<button class="create-main-btn" onclick={toggleCreateMenu}>
					<span>➕</span>
					<span>Create New</span>
					<span class="arrow">{showCreateMenu ? '▼' : '▶'}</span>
				</button>

				<!-- Create Menu Dropdown -->
				{#if showCreateMenu}
					<div class="create-dropdown">
						<button class="create-option" onclick={() => createEntity('timeline_event')}>
							<span class="option-icon">📅</span>
							<span>Timeline Event</span>
						</button>
						<button class="create-option" onclick={() => createEntity('investigation_action')}>
							<span class="option-icon">🔍</span>
							<span>Investigation Action</span>
						</button>
						<button class="create-option" onclick={() => createEntity('entity')}>
							<span class="option-icon">🏷️</span>
							<span>Entity</span>
						</button>
						<button class="create-option" onclick={() => createEntity('incident')}>
							<span class="option-icon">🚨</span>
							<span>Incident</span>
						</button>
						<button class="create-option" onclick={() => createEntity('annotation')}>
							<span class="option-icon">📝</span>
							<span>Annotation</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Quick Stats -->
			<div class="quick-stats">
				<div class="stat-item">
					<span class="stat-label">Incidents</span>
					<span class="stat-value">{$currentCachedIncidents.length}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Analysts</span>
					<span class="stat-value">{$analysts.length}</span>
				</div>
			</div>
		</div>
	</div>
{/if}
