<script lang="ts">
	import type { PageProps } from './$types';
	import {incidentStats, currentSelectedAnalyst, currentSelectedIncident, currentCachedIncidents, actionTypes} from '$lib/stores/cacheStore';
	import type { Incident } from '$lib/server/database';
	import { goto } from '$app/navigation';

	let { data }: PageProps = $props();

	function userSelectedIncident(incident: Incident) {
		$currentSelectedIncident = incident;
		console.log("Main - User selected incident:", incident);
		goto(`/incident/${incident.uuid}`);
	}

</script>

<div class="dashboard">
	<!-- Header -->
	<div class="header">
		<div class="header-info">
			<span class="header-label">Analyst:</span>
			<span class="header-value">{$currentSelectedAnalyst?.full_name || 'Not Selected'}</span>
		</div>
		<!-- Statistics -->
		<div class="stats-info">
			<div class="stat-card info">
				<div class="stat-label">Total</div>
				<div class="stat-value">{$incidentStats.total || 0}</div>
			</div>
			<div class="divider"> | </div>
			<div class="stat-card critical">
				<div class="stat-label">Critical</div>
				<div class="stat-value">{$incidentStats.critical || 0}</div>
			</div>
			<div class="stat-card warning">
				<div class="stat-label">High</div>
				<div class="stat-value">{$incidentStats.high || 0}</div>
			</div>
			<div class="divider"> | </div>
			<div class="stat-card info">
				<div class="stat-label">In Progress</div>
				<div class="stat-value">{$incidentStats.inProgress || 0}</div>
			</div>
			<div class="stat-card success">
				<div class="stat-label">Closed</div>
				<div class="stat-value">{$incidentStats.closed || 0}</div>
			</div>
		</div>
	</div>

	<!-- Recent Incidents -->
	<div class="section">
		<div class="section-header">Recent Incidents</div>
		<div class="section-content">
			<div class="incident-list">
				{#each $currentCachedIncidents as incident, i}
					<button 
						class="incident-item" 
						onclick={() => userSelectedIncident(incident)}
						type="button"
					>
						<span class="incident-number">{String(i + 1).padStart(2, '0')}</span>
						<div class="incident-content">
							<div class="incident-title">{incident.title}</div>
							<div class="incident-meta">
								<span class="status-badge">{incident.status}</span>
								<span>•</span>
								<span>{incident.created_at}</span>
							</div>
						</div>
					</button>
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

		<!-- Action Types -->
		<div class="section">
			<div class="section-header">Action Types</div>
			<div class="section-content">
				<div class="action-list">
					{#each $actionTypes as action_type}
						<div class="action-item">
							<div class="action-name">{action_type.name}</div>
							<div class="action-description">{action_type.description}</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		min-height: 100vh;
		padding: var(--spacing-lg);
		max-width: 1000px;
		min-width: 700px;
		margin: 0 auto;
	}

	.header {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		padding: var(--spacing-xs) var(--spacing-sm);
		margin-bottom: var(--spacing-lg);
		display: flex;
		align-items: center;
		justify-content: left;
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: var(--spacing-md);
		font-size: var(--font-size-sm);
	}

	.header-label {
		color: var(--color-text-tertiary);
	}

	.header-value {
		color: var(--color-accent-primary);
		font-weight: var(--font-weight-medium);
	}

	.stats-info {
		display: flex;
		gap: var(--spacing-sm);
		margin-left: auto;

	}

	.stat-card {
		display: flex;
		flex-direction: row;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		padding-left: var(--spacing-md);
		padding-right: var(--spacing-md);
	}

	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-semibold);
		padding-left: var(--spacing-sm);
		color: var(--color-text-primary);
	}

	.stat-card.critical .stat-value { color: var(--color-accent-error); }
	.stat-card.warning .stat-value { color: var(--color-accent-warning); }
	.stat-card.success .stat-value { color: var(--color-accent-success); }
	.stat-card.info .stat-value { color: var(--color-accent-primary); }

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

	.divider {
		color: var(--color-text-tertiary);
		font-size: var(--font-size-sm);
		align-self: center;
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

	.action-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		max-height: 300px;
		overflow-y: auto;
	}

	.action-item {
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--border-radius-sm);
		transition: border-color var(--transition-fast);
	}

	.action-item:hover {
		border-color: var(--color-border-medium);
	}

	.action-name {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		margin-bottom: var(--spacing-xs);
	}

	.action-description {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		line-height: 1.4;
	}
</style>