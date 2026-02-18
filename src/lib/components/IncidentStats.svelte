<script lang="ts">
	import { investigationStats, entityStats } from '$lib/stores/cacheStore';
</script>

<div class="stats-row">
	<div class="stat-card total">
		<span class="stat-value">{$investigationStats.total}</span>
		<span class="stat-label">Total Items</span>
	</div>

	<div class="stat-card events">
		<span class="stat-value">{$investigationStats.events}</span>
		<span class="stat-label">Events</span>
	</div>

	<div class="stat-card actions">
		<span class="stat-value">{$investigationStats.actions}</span>
		<span class="stat-label">Actions</span>
	</div>

	<div class="stat-card entities">
		<span class="stat-value">{$entityStats.total}</span>
		<span class="stat-label">Entities</span>
	</div>
</div>

<style>
	.stats-row {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.stat-card {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		background: hsl(var(--bg-surface-100));
		border: 1px solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		padding: var(--space-3) var(--space-4);
	}

	.stat-value {
		font-family: var(--font-mono);
		font-weight: var(--font-semibold);
		font-size: var(--text-lg);
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
		margin-left: var(--space-2);
	}

	/* Card-specific value colors */
	.stat-card.total .stat-value {
		color: hsl(var(--fg-default));
	}

	.stat-card.events .stat-value {
		color: hsl(var(--info-default));
	}

	.stat-card.actions .stat-value {
		color: hsl(var(--brand-default));
	}

	.stat-card.entities .stat-value {
		color: hsl(var(--warning-default));
	}
</style>