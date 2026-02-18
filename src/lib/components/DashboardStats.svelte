<script lang="ts">
	import { incidentStats } from '$lib/stores/cacheStore';
</script>

<div class="stats-grid">
	<div class="stat-card total">
		<span class="stat-value">{$incidentStats.total}</span>
		<span class="stat-label">Total</span>
	</div>

	<div class="stat-card critical">
		<span class="stat-value">{$incidentStats.critical}</span>
		<span class="stat-label">Critical</span>
	</div>

	<div class="stat-card high">
		<span class="stat-value">{$incidentStats.high}</span>
		<span class="stat-label">High</span>
	</div>

	<div class="stat-card medium">
		<span class="stat-value">{$incidentStats.medium}</span>
		<span class="stat-label">Medium</span>
	</div>

	<div class="stat-card low">
		<span class="stat-value">{$incidentStats.low}</span>
		<span class="stat-label">Low</span>
	</div>

	<div class="stat-card in-progress">
		<span class="stat-value">{$incidentStats.inProgress}</span>
		<span class="stat-label">In Progress</span>
	</div>

	<div class="stat-card closed">
		<span class="stat-value">{$incidentStats.closed}</span>
		<span class="stat-label">Closed</span>
	</div>
</div>

<style>
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-3);
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		background: hsl(var(--bg-surface-100));
		border: 1px solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		padding: var(--space-4);
	}

	.stat-value {
		font-family: var(--font-mono);
		font-weight: var(--font-bold);
		font-size: var(--text-2xl);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-default));
	}

	.stat-label {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: hsl(var(--fg-light));
		margin-top: var(--space-1);
	}

	/* Severity & status value colors */
	.stat-card.total .stat-value {
		color: hsl(var(--brand-default));
	}

	.stat-card.critical .stat-value {
		color: hsl(var(--severity-critical));
	}

	.stat-card.high .stat-value {
		color: hsl(var(--severity-high));
	}

	.stat-card.medium .stat-value {
		color: hsl(var(--severity-medium));
	}

	.stat-card.low .stat-value {
		color: hsl(var(--severity-low));
	}

	.stat-card.in-progress .stat-value {
		color: hsl(var(--status-open));
	}

	.stat-card.closed .stat-value {
		color: hsl(var(--success-default));
	}
</style>