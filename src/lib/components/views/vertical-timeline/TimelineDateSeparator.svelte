<script lang="ts">
	interface Props {
		date: string;
	}

	let { date }: Props = $props();

	const formattedDate = $derived(
		new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	);
</script>

<div class="date-separator" role="separator" aria-label={formattedDate}>
	<div class="date-separator-line"></div>
	<span class="date-separator-label">{formattedDate}</span>
	<div class="date-separator-line"></div>
</div>

<style>
	.date-separator {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4) 0;
	}

	.date-separator-line {
		flex: 1;
		height: var(--border-width);
		background: hsl(var(--border-muted));
	}

	.date-separator-label {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-lighter));
		white-space: nowrap;
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}
</style>
