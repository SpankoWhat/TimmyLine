<script lang="ts">
	import { 
		currentSelectedAnalyst,
		currentSelectedIncident,
		currentCachedIncidents,
		analysts,
		initializeAllCaches
	} from '$lib/stores/cacheStore';
	import { modalStore } from '$lib/stores/modalStore';
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
		modalStore.open({
			title: entityType.replace(/_/g, ' '),
			entityType: entityType as any,
			mode: 'create',
			onSubmit: async (data) => {
				// Add current incident UUID for core entities
				if (['timeline_event', 'investigation_action', 'annotation', 'entity'].includes(entityType)) {
					data.incident_id = $currentSelectedIncident?.uuid;
				}
				
				// Add analyst UUID
				data.analyst_id = $currentSelectedAnalyst?.uuid;
				
				// Determine API endpoint based on entity type
				let endpoint = '';
				if (['action_type', 'entity_type', 'event_type', 'annotation_type'].includes(entityType)) {
					endpoint = `/api/create/lookup`;
				} else {
					endpoint = `/api/create/core/${entityType}`;
				}
				
				const response = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				});
				
				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to save');
				}
				
				// Refresh caches
				await initializeAllCaches();
			}
		});
		
		showCreateMenu = false;
	}
</script>

<!-- Floating Action Button (when collapsed) -->
{#if !isExpanded}
	<button 
		class="floating-toggle"
		onclick={toggleExpanded}
		title="Quick Actions">
		<span class="toggle-icon">⚡</span>
		<span class="pulse-ring"></span>
	</button>
{/if}

<!-- Expanded Quick Actions Panel -->
{#if isExpanded}
	<div class="quick-actions-panel">
		<!-- Header -->
		<div class="panel-header">
			<div class="flex items-center gap-2">
				<span class="text-yellow-400 text-lg">⚡</span>
				<h3 class="text-sm font-bold text-yellow-300 uppercase tracking-wider">Quick Actions</h3>
			</div>
			<button 
				class="close-btn"
				onclick={toggleExpanded}
				title="Close">
				✕
			</button>
		</div>

		<!-- Content -->
		<div class="panel-content">
			
			<!-- Analyst Selector -->
			<div class="selector-group">
				<div class="selector-label">
					<span class="label-icon text-cyan-400">👤</span>
					<span class="label-text">Active Analyst</span>
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
					<span class="label-icon text-red-400">🔥</span>
					<span class="label-text">Active Incident</span>
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
			<div class="relative">
				<button 
					class="create-main-btn"
					onclick={toggleCreateMenu}>
					<span class="text-base">➕</span>
					<span>Create New</span>
					<span class="ml-auto text-xs">{showCreateMenu ? '▼' : '▶'}</span>
				</button>

				<!-- Create Menu Dropdown -->
				{#if showCreateMenu}
					<div class="create-dropdown">
						<button 
							class="create-option event"
							onclick={() => createEntity('timeline_event')}>
							<span class="option-icon">📅</span>
							<span class="option-text">Timeline Event</span>
						</button>
						<button 
							class="create-option action"
							onclick={() => createEntity('investigation_action')}>
							<span class="option-icon">🔍</span>
							<span class="option-text">Investigation Action</span>
						</button>
						<button 
							class="create-option entity"
							onclick={() => createEntity('entity')}>
							<span class="option-icon">🏷️</span>
							<span class="option-text">Entity</span>
						</button>
						<button 
							class="create-option incident"
							onclick={() => createEntity('incident')}>
							<span class="option-icon">🚨</span>
							<span class="option-text">Incident</span>
						</button>
						<button 
							class="create-option annotation"
							onclick={() => createEntity('annotation')}>
							<span class="option-icon">📝</span>
							<span class="option-text">Annotation</span>
						</button>
					</div>
				{/if}
			</div>

			<!-- Quick Stats -->
			<div class="quick-stats">
				<div class="stat-item">
					<span class="stat-label">Incidents:</span>
					<span class="stat-value">{$currentCachedIncidents.length}</span>
				</div>
				<div class="stat-item">
					<span class="stat-label">Analysts:</span>
					<span class="stat-value">{$analysts.length}</span>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Floating Toggle Button */
	.floating-toggle {
		position: fixed;
		top: 1rem;
		right: 1rem;
		width: 3.5rem;
		height: 3.5rem;
		background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.3));
		border: 2px solid rgba(234, 179, 8, 0.5);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s ease;
		z-index: 1000;
		box-shadow: 0 4px 20px rgba(234, 179, 8, 0.3);
		backdrop-filter: blur(10px);
	}

	.floating-toggle:hover {
		transform: scale(1.1) rotate(15deg);
		border-color: rgba(234, 179, 8, 0.8);
		box-shadow: 0 6px 30px rgba(234, 179, 8, 0.5);
	}

	.toggle-icon {
		font-size: 1.5rem;
		animation: pulse 2s infinite;
	}

	.pulse-ring {
		position: absolute;
		width: 100%;
		height: 100%;
		border: 2px solid rgba(234, 179, 8, 0.4);
		border-radius: 50%;
		animation: pulse-ring 2s infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(0.95);
		}
	}

	@keyframes pulse-ring {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		100% {
			transform: scale(1.5);
			opacity: 0;
		}
	}

	/* Quick Actions Panel */
	.quick-actions-panel {
		position: fixed;
		top: 1rem;
		right: 1rem;
		width: 320px;
		max-height: calc(100vh - 120px);
		background: linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95));
		border: 2px solid rgba(234, 179, 8, 0.4);
		border-radius: 0.75rem;
		backdrop-filter: blur(16px);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 60px rgba(234, 179, 8, 0.2);
		z-index: 1000;
		font-family: 'Courier New', monospace;
		overflow: hidden;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(100px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* Panel Header */
	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: linear-gradient(90deg, rgba(234, 179, 8, 0.15), rgba(202, 138, 4, 0.1));
		border-bottom: 1px solid rgba(234, 179, 8, 0.3);
	}

	.close-btn {
		width: 1.75rem;
		height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: 0.25rem;
		color: #fca5a5;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
	}

	.close-btn:hover {
		background: rgba(239, 68, 68, 0.3);
		border-color: rgba(239, 68, 68, 0.6);
		color: #fee2e2;
		transform: scale(1.1);
	}

	/* Panel Content */
	.panel-content {
		padding: 1rem;
		max-height: calc(100vh - 180px);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel-content::-webkit-scrollbar {
		width: 6px;
	}

	.panel-content::-webkit-scrollbar-track {
		background: rgba(15, 23, 42, 0.5);
	}

	.panel-content::-webkit-scrollbar-thumb {
		background: rgba(234, 179, 8, 0.3);
		border-radius: 3px;
	}

	.panel-content::-webkit-scrollbar-thumb:hover {
		background: rgba(234, 179, 8, 0.5);
	}

	/* Selector Groups */
	.selector-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.selector-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #cbd5e1;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.label-icon {
		font-size: 1rem;
	}

	.selector-input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: rgba(15, 23, 42, 0.8);
		border: 1px solid rgba(148, 163, 184, 0.3);
		border-radius: 0.375rem;
		color: #e2e8f0;
		font-size: 0.875rem;
		font-family: 'Courier New', monospace;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.selector-input:hover {
		border-color: rgba(234, 179, 8, 0.5);
		background: rgba(15, 23, 42, 0.9);
	}

	.selector-input:focus {
		outline: none;
		border-color: rgba(234, 179, 8, 0.7);
		box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
	}

	/* Divider */
	.divider {
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(148, 163, 184, 0.3), transparent);
		margin: 0.5rem 0;
	}

	/* Create Button */
	.create-main-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.15));
		border: 1px solid rgba(34, 197, 94, 0.4);
		border-radius: 0.375rem;
		color: #86efac;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.create-main-btn:hover {
		background: linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2));
		border-color: rgba(34, 197, 94, 0.6);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
	}

	/* Create Dropdown */
	.create-dropdown {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		background: rgba(15, 23, 42, 0.9);
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 0.375rem;
		padding: 0.5rem;
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
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: rgba(71, 85, 105, 0.2);
		border: 1px solid transparent;
		border-radius: 0.25rem;
		color: #cbd5e1;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
	}

	.create-option:hover {
		background: rgba(71, 85, 105, 0.4);
		transform: translateX(4px);
	}

	.create-option.event:hover {
		border-color: rgba(59, 130, 246, 0.5);
		color: #93c5fd;
	}

	.create-option.action:hover {
		border-color: rgba(34, 197, 94, 0.5);
		color: #86efac;
	}

	.create-option.entity:hover {
		border-color: rgba(168, 85, 247, 0.5);
		color: #d8b4fe;
	}

	.create-option.incident:hover {
		border-color: rgba(239, 68, 68, 0.5);
		color: #fca5a5;
	}

	.create-option.annotation:hover {
		border-color: rgba(234, 179, 8, 0.5);
		color: #fde047;
	}

	.option-icon {
		font-size: 1rem;
	}

	/* Quick Stats */
	.quick-stats {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(15, 23, 42, 0.6);
		border: 1px solid rgba(148, 163, 184, 0.2);
		border-radius: 0.375rem;
	}

	.stat-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		text-align: center;
	}

	.stat-label {
		font-size: 0.65rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: bold;
		color: #34d399;
	}
</style>
