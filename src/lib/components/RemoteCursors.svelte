<script lang="ts">
	import { remoteCursors } from '$lib/stores/collabStore';

	/**
	 * Generate a deterministic HSL color from a string (analyst name).
	 * Matches the color logic used in ActiveUsersIndicator.
	 */
	function colorFromString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = ((hash % 360) + 360) % 360;
		return `hsl(${hue}, 55%, 50%)`;
	}

	let cursors = $derived([...$remoteCursors.entries()]);
</script>

{#if cursors.length > 0}
	<div class="cursor-overlay" aria-hidden="true">
		{#each cursors as [analystUUID, cursor] (analystUUID)}
			<div
				class="remote-cursor"
				style:left="{cursor.x}px"
				style:top="{cursor.y}px"
				style:--cursor-color={colorFromString(cursor.analystName)}
			>
				<!-- Cursor arrow SVG -->
				<svg
					class="cursor-arrow"
					width="16"
					height="20"
					viewBox="0 0 16 20"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M1 1L6 18L8.5 10.5L15 8.5L1 1Z"
						fill="var(--cursor-color)"
						stroke="hsl(0 0% 0% / 0.5)"
						stroke-width="1"
						stroke-linejoin="round"
					/>
				</svg>
				<!-- Name label -->
				<span
					class="cursor-label"
					style:background-color="var(--cursor-color)"
				>
					{cursor.analystName}
				</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.cursor-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: var(--z-tooltip);
		overflow: visible;
	}

	.remote-cursor {
		position: absolute;
		will-change: left, top;
		transition: left 80ms linear, top 80ms linear;
	}

	.cursor-arrow {
		display: block;
		filter: drop-shadow(0 1px 2px hsl(0 0% 0% / 0.4));
	}

	.cursor-label {
		position: absolute;
		top: 16px;
		left: 10px;
		padding: var(--space-0\.5) var(--space-1\.5);
		border-radius: var(--radius-sm);
		font-family: var(--font-family);
		font-size: var(--text-2xs);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-contrast));
		white-space: nowrap;
		line-height: var(--leading-none);
		box-shadow: var(--shadow-sm);
	}

	@media (prefers-reduced-motion: reduce) {
		.remote-cursor {
			transition-duration: 0.01ms !important;
		}
	}
</style>
