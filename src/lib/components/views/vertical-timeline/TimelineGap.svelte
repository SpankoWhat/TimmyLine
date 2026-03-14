<script lang="ts">
	interface Props {
		durationSeconds: number;
	}

	let { durationSeconds }: Props = $props();

	function formatGap(seconds: number): { short: string; long: string } {
		if (seconds < 60) {
			const s = Math.round(seconds);
			return { short: `${s}s gap`, long: `${s} second gap` };
		}
		if (seconds < 3600) {
			const m = Math.floor(seconds / 60);
			return { short: `${m}m gap`, long: `${m} minute gap` };
		}
		if (seconds < 86400) {
			const h = Math.floor(seconds / 3600);
			const m = Math.floor((seconds % 3600) / 60);
			const shortStr = m > 0 ? `${h}h ${m}m gap` : `${h}h gap`;
			const longStr =
				m > 0 ? `${h} hour ${m} minute gap` : `${h} hour gap`;
			return { short: shortStr, long: longStr };
		}
		const d = Math.floor(seconds / 86400);
		const h = Math.floor((seconds % 86400) / 3600);
		const shortStr = h > 0 ? `${d}d ${h}h gap` : `${d}d gap`;
		const longStr = h > 0 ? `${d} day ${h} hour gap` : `${d} day gap`;
		return { short: shortStr, long: longStr };
	}

	let formatted = $derived(formatGap(durationSeconds));
</script>

<div class="timeline-gap" role="separator" aria-label={formatted.long}>
	<div class="gap-content">
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
		<span class="gap-label">{formatted.short}</span>
	</div>
</div>

<style>
	.timeline-gap {
		display: flex;
		justify-content: center;
		padding: var(--space-2) 0;
	}

	.gap-content {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1\.5);
		padding: var(--space-1) var(--space-3);
		border: var(--border-width) dashed hsl(var(--border-default));
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-muted));
	}
</style>
