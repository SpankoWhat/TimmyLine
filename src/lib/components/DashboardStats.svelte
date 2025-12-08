<script lang="ts">
	import { 
		incidentStats,
	} from '$lib/stores/cacheStore';
</script>

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

<style>
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
</style>