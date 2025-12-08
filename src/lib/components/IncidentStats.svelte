<script lang="ts">
    import { 
        combinedTimeline,
        currentCachedTimelineEvents,
        currentCachedInvestigationActions
    } from '$lib/stores/cacheStore';
</script>



<div class="stat-card success">
	<span class="stat-label">Total</span>
	<span class="stat-value">{$combinedTimeline.length || 0}</span>
</div>
<div class="divider"> | </div>
<div class="stat-card info">
	<span class="stat-label">Events</span>
	<span class="stat-value">{$currentCachedTimelineEvents.length || 0}</span>
</div>
<div class="stat-card info">
	<span class="stat-label">Actions</span>
	<span class="stat-value">{$currentCachedInvestigationActions.length || 0}</span>
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