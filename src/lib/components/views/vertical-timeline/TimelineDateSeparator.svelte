<script lang="ts">
	import { timePreferences } from '$lib/stores/timePreferencesStore';
	import { formatAbsoluteTimestamp } from '$lib/utils/dateTime';

	interface Props {
		dateKey: string;
		epoch: number;
	}

	let { dateKey, epoch }: Props = $props();

	const formattedDate = $derived.by(() => {
		const isoLikeAbsolute = formatAbsoluteTimestamp(epoch, {
			...$timePreferences,
			absoluteFormat: 'iso-like',
			displayMode: 'absolute'
		});
		if (!isoLikeAbsolute || isoLikeAbsolute === '—') {
			return dateKey;
		}
		return isoLikeAbsolute.split(' ')[0] || dateKey;
	});
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
