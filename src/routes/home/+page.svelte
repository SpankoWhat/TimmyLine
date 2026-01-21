<script lang="ts">
	import type { PageProps } from './$types';
	import { currentCachedIncidents } from '$lib/stores/cacheStore';
	import type { Incident } from '$lib/server/database';
	import { goto } from '$app/navigation';
	import { getContext, onMount, onDestroy } from 'svelte';
	import DashboardStats from '$lib/components/DashboardStats.svelte';
	import HomePageActions from '$lib/components/HomePageActions.svelte';
	import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
	import { joinLobbySocket, leaveLobbySocket, usersInLobby, usersInEachIncident, initializeSocket} from '$lib/stores/collabStore';

	let { data }: PageProps = $props();
	const { register, unregister } : any = getContext('dynamicLayoutSlots');

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

	onMount(() => {
		document.title = `Dashboard - TimmyLine`;
		register('stats', DashboardStats);
		register('actions', HomePageActions);
		initializeSocket();
		joinLobbySocket();
	});

	onDestroy(() => {
		unregister('stats');
		unregister('actions');
		leaveLobbySocket();
	});

</script>

<div class="dashboard">
	<!-- Recent Incidents -->
	<div class="section">
		<div class="section-header">Active Incidents</div>
		<div class="section-content">
			<div class="incident-list">
				{#each $currentCachedIncidents.filter(incident => incident.status === 'In Progress') as incident, i}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div 
						class="incident-item" 
						onclick={() => userSelectedIncident(incident)}
						onkeydown={(e) => e.key === 'Enter' && userSelectedIncident(incident)}
						tabindex="0"
						role="button"
					>
						<span class="incident-number">{String(i + 1).padStart(2, '0')}</span>
						<div class="incident-content">
							<div class="incident-title">{incident.title}</div>
							<div class="incident-meta">
								<span>•</span>
								<span>{incident.status}</span>
								<span>•</span>
								<span>{incident.created_at}</span>
								<!-- User activity -->
								{#if ($usersInEachIncident.get(incident.uuid) ?? 0) > 0}
									<span>•</span>
									<span class="user-count-badge" title="{$usersInEachIncident.get(incident.uuid) ?? 0} active user{($usersInEachIncident.get(incident.uuid) ?? 0) !== 1 ? 's' : ''}">
										👤 {$usersInEachIncident.get(incident.uuid) ?? 0}
									</span>
								{/if}						
							</div>
						</div>
						<div class="actions">
							<button
								class="action-btn"
								title="Edit"
								onclick={(e) => editIncident(e, incident)}>
								<span class="btn-icon">✎</span>
							</button>
							<button
								class="action-btn"
								title="Delete"
								onclick={(e) => deleteIncident(e, incident)}>
								<span class="btn-icon">✕</span>
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Bottom Grid -->
	<div class="two-column-grid">
		<!-- System Health -->
		<div class="section">
			<div class="section-header">System Health</div>
			<div class="section-content">
				<div class="info-row">
					<span class="info-label">Database</span>
					<span class="info-value">{data.health.database}</span>
				</div>
				<div class="info-row">
					<span class="info-label">Status</span>
					<span class="info-value success">{data.health.status}</span>
				</div>
				{#if data.health.error}
					<div class="info-row">
						<span class="info-label">Error</span>
						<span class="info-value" style="color: var(--color-accent-error)">{data.health.error}</span>
					</div>
				{/if}
			</div>
		</div>
		<!-- Collaboration Lobby -->
		<div class="section">
			<div class="section-header">Users in Lobby</div>
			<div class="section-content">
				{#if $usersInLobby.size > 0}			
					{#each $usersInLobby as user, i}
						<div class="info-row">
							<span class="info-label">{user[1].analystUUID}</span>
							<span class="info-value">{user[1].analystName}</span>
						</div>
					{/each}
				{:else}
					<span class="info-value">No users currently in the lobby.</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		padding-top: var(--header-height);
		max-width: 1000px;
		min-width: 700px;
		margin: 0 auto;
	}

	.section {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		margin-bottom: var(--spacing-lg);

	}

	.section-header {
		padding: var(--spacing-xs) var(--spacing-sm);
		border-bottom: 1px solid var(--color-border-subtle);
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.section-content {
		padding: var(--spacing-md);
	}

	.incident-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		max-height: 400px;
		overflow-y: auto;
	}

	.incident-item {
		display: flex;
		gap: var(--spacing-md);
		padding: var(--spacing-xs) var(--spacing-xs);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.incident-item:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-border-medium);
	}

	.incident-number {
		font-size: var(--font-size-xs);
		align-content: center;
		color: var(--color-text-dim);
		font-variant-numeric: tabular-nums;
		min-width: 1.5rem;
	}

	.incident-content {
		display: flex;
		align-content: center;
		flex-direction: row;
		flex: 1;
		min-width: 0;
	}

	.incident-title {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		white-space: nowrap;
		padding-right: var(--spacing-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		align-content: center;
	}

	.incident-meta {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
	}

	.status-badge {
		padding: 2px var(--spacing-sm);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border-medium);
	}

	.two-column-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--spacing-md);
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-sm) 0;
		font-size: var(--font-size-sm);
	}

	.info-row:not(:last-child) {
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.info-label {
		color: var(--color-text-tertiary);
	}

	.info-value {
		color: var(--color-text-primary);
		font-weight: var(--font-weight-medium);
	}

	.info-value.success {
		color: var(--color-accent-success);
	}

	.actions {
		display: flex;
		gap: 4px;
		align-items: center;
		margin-left: auto;
	}

	.action-btn {
		background: transparent;
		border: 1px solid var(--color-border-medium);
		color: var(--color-text-secondary);
		padding: 0 6px;
		cursor: pointer;
		font-size: 12px;
		border-radius: 2px;
		transition: all 0.15s ease;
		line-height: 1;
		height: 20px;
	}

	.action-btn:hover {
		border-color: var(--color-accent-warning);
		color: var(--color-accent-warning);
		background: rgba(255, 0, 0, 0.1);
	}

	.btn-icon {
		font-size: 12px;
	}

	.user-count-badge {
		padding: 2px var(--spacing-sm);
		border-radius: var(--border-radius-sm);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		background: var(--color-bg-primary);
		border: 1px solid var(--color-accent-info);
		color: var(--color-accent-info);
		font-variant-numeric: tabular-nums;
	}
</style>