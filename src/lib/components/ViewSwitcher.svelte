<script lang="ts">
	import { currentTimelineView } from '$lib/stores/cacheStore';
	import { timelineViews } from '$lib/config/timelineViews';

	/** Icon SVG paths keyed by icon identifier */
	const icons: Record<string, { paths: string }> = {
		list: {
			paths: `<line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />`
		},
		timeline: {
			paths: `<line x1="5" y1="1" x2="5" y2="15" /><circle cx="5" cy="4" r="1.5" /><circle cx="5" cy="9" r="1.5" /><circle cx="5" cy="13" r="1.5" /><line x1="6.5" y1="4" x2="13" y2="4" /><line x1="6.5" y1="9" x2="11" y2="9" />`
		}
	};

	function handleKeydown(event: KeyboardEvent) {
		const currentIndex = timelineViews.findIndex((v) => v.id === $currentTimelineView);
		let newIndex = currentIndex;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			newIndex = (currentIndex + 1) % timelineViews.length;
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			newIndex = (currentIndex - 1 + timelineViews.length) % timelineViews.length;
		} else {
			return;
		}

		$currentTimelineView = timelineViews[newIndex].id;

		// Focus the newly active button
		const container = event.currentTarget as HTMLElement;
		const buttons = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
		buttons[newIndex]?.focus();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
	class="view-switcher"
	role="tablist"
	aria-label="Timeline view"
	onkeydown={handleKeydown}
>
	{#each timelineViews as view (view.id)}
		{@const isActive = $currentTimelineView === view.id}
		<button
			class="view-switcher-btn"
			class:active={isActive}
			role="tab"
			aria-selected={isActive}
			tabindex={isActive ? 0 : -1}
			title={view.description}
			onclick={() => ($currentTimelineView = view.id)}
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{@html icons[view.icon]?.paths ?? ''}
			</svg>
			<span class="view-switcher-label">{view.label}</span>
		</button>
	{/each}
</div>

<style>
	.view-switcher {
		display: inline-flex;
		align-items: center;
		gap: 0;
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.view-switcher-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-1);
		height: 28px;
		padding: 0 var(--space-2);
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-lighter));
		background: transparent;
		border: none;
		border-right: var(--border-width) solid hsl(var(--border-default));
		cursor: pointer;
		transition: var(--transition-colors);
		white-space: nowrap;
	}

	.view-switcher-btn:last-child {
		border-right: none;
	}

	.view-switcher-btn:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}

	.view-switcher-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: -2px;
		z-index: 1;
	}

	.view-switcher-btn.active {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--brand-default));
	}

	.view-switcher-label {
		display: none;
	}

	/* Show labels when there's enough room */
	@media (min-width: 1400px) {
		.view-switcher-label {
			display: inline;
		}
	}
</style>
