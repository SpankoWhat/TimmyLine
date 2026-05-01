<script module>
	/** Shared z-index counter across all FloatingPanel instances */
	let topZ = 250;
	function getNextZ() {
		topZ += 1;
		return topZ;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let {
		title,
		panelId,
		defaultPosition = { x: 100, y: 100 },
		defaultSize = { width: 400, height: 400 },
		minWidth = 320,
		minHeight = 200,
		onclose,
		ondock,
		children,
	}: {
		title: string;
		panelId: string;
		defaultPosition?: { x: number; y: number };
		defaultSize?: { width: number; height: number };
		minWidth?: number;
		minHeight?: number;
		onclose?: () => void;
		ondock?: () => void;
		children: Snippet;
	} = $props();

	function getDefaultPanelState() {
		return {
			x: defaultPosition.x,
			y: defaultPosition.y,
			width: defaultSize.width,
			height: defaultSize.height,
		};
	}

	function getStorageKey() {
		return `timmyline-float-panel-${panelId}`;
	}

	const initialState = getDefaultPanelState();

	// Panel position & size
	let x = $state(initialState.x);
	let y = $state(initialState.y);
	let width = $state(initialState.width);
	let height = $state(initialState.height);
	let zIndex = $state(getNextZ());

	// Drag state
	let isDragging = $state(false);
	let dragStartX = 0;
	let dragStartY = 0;
	let panelStartX = 0;
	let panelStartY = 0;

	// Resize state
	let isResizing = $state(false);
	let resizeStartX = 0;
	let resizeStartY = 0;
	let resizeStartW = 0;
	let resizeStartH = 0;

	onMount(() => {
		const defaults = getDefaultPanelState();

		try {
			const saved = localStorage.getItem(getStorageKey());
			if (saved) {
				const data = JSON.parse(saved);
				x = data.x ?? defaults.x;
				y = data.y ?? defaults.y;
				width = data.width ?? defaults.width;
				height = data.height ?? defaults.height;
			}
		} catch {
			// Ignore parse errors
		}
		constrainToViewport();
	});

	function saveState() {
		try {
			localStorage.setItem(getStorageKey(), JSON.stringify({ x, y, width, height }));
		} catch {
			// Ignore storage errors
		}
	}

	function constrainToViewport() {
		const vw = window.innerWidth;
		const vh = window.innerHeight;
		// Keep at least 100px visible horizontally, 50px vertically
		if (x < -width + 100) x = -width + 100;
		if (y < 0) y = 0;
		if (x > vw - 100) x = vw - 100;
		if (y > vh - 50) y = vh - 50;
	}

	function bringToFront() {
		zIndex = getNextZ();
	}

	// ===== Drag =====
	function handleDragStart(e: PointerEvent) {
		// Don't drag when clicking action buttons
		if ((e.target as HTMLElement).closest('.float-panel-actions')) return;
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		panelStartX = x;
		panelStartY = y;
		bringToFront();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handleDragMove(e: PointerEvent) {
		if (!isDragging) return;
		x = panelStartX + (e.clientX - dragStartX);
		y = panelStartY + (e.clientY - dragStartY);
	}

	function handleDragEnd() {
		if (!isDragging) return;
		isDragging = false;
		constrainToViewport();
		saveState();
	}

	// ===== Resize =====
	function handleResizeStart(e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
		isResizing = true;
		resizeStartX = e.clientX;
		resizeStartY = e.clientY;
		resizeStartW = width;
		resizeStartH = height;
		bringToFront();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handleResizeMove(e: PointerEvent) {
		if (!isResizing) return;
		width = Math.max(minWidth, resizeStartW + (e.clientX - resizeStartX));
		height = Math.max(minHeight, resizeStartH + (e.clientY - resizeStartY));
	}

	function handleResizeEnd() {
		if (!isResizing) return;
		isResizing = false;
		saveState();
	}

	// ===== Keyboard =====
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && onclose) {
			onclose();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="float-panel"
	class:dragging={isDragging}
	class:resizing={isResizing}
	style="left: {x}px; top: {y}px; width: {width}px; height: {height}px; z-index: {zIndex};"
	onpointerdown={bringToFront}
	onkeydown={handleKeydown}
	role="dialog"
	aria-label={title}
	tabindex="-1"
>
	<div
		class="float-panel-header"
		onpointerdown={handleDragStart}
		onpointermove={handleDragMove}
		onpointerup={handleDragEnd}
	>
		<span class="float-panel-title">{title}</span>
		<div class="float-panel-actions">
			{#if ondock}
				<button
					class="panel-action-btn"
					onclick={ondock}
					title="Dock panel"
					aria-label="Dock panel"
				>
					<!-- Dock icon: panel docked to right side -->
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
						<rect x="2" y="2" width="12" height="12" rx="2" />
						<line x1="10" y1="2" x2="10" y2="14" />
					</svg>
				</button>
			{/if}
			{#if onclose}
				<button
					class="panel-action-btn close-btn"
					onclick={onclose}
					title="Close panel"
					aria-label="Close panel"
				>
					<!-- Close icon: X -->
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
						<line x1="4" y1="4" x2="12" y2="12" />
						<line x1="12" y1="4" x2="4" y2="12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<div class="float-panel-body">
		{@render children()}
	</div>

	<!-- Resize handle at bottom-right corner -->
	<div
		class="resize-handle"
		onpointerdown={handleResizeStart}
		onpointermove={handleResizeMove}
		onpointerup={handleResizeEnd}
		role="separator"
		aria-orientation="horizontal"
		aria-label="Resize panel"
	></div>
</div>

<style>
	/* ===== Float Panel (SOP §15.1) ===== */
	.float-panel {
		position: fixed;
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-overlay));
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-float);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.float-panel.dragging {
		cursor: grabbing;
		user-select: none;
	}

	.float-panel.resizing {
		user-select: none;
	}

	/* ===== Header ===== */
	.float-panel-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-surface-300));
		border-bottom: var(--border-width) solid hsl(var(--border-default));
		cursor: grab;
		user-select: none;
		flex-shrink: 0;
	}

	.float-panel.dragging .float-panel-header {
		cursor: grabbing;
	}

	.float-panel-title {
		flex: 1;
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.float-panel-actions {
		display: flex;
		gap: var(--space-1);
		flex-shrink: 0;
	}

	.panel-action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		color: hsl(var(--fg-lighter));
		background: transparent;
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.panel-action-btn:hover {
		background: hsl(var(--bg-surface-400));
		color: hsl(var(--fg-default));
	}

	.panel-action-btn:focus-visible {
		outline: var(--border-width-thick) solid hsl(var(--border-focus));
		outline-offset: 1px;
	}

	.panel-action-btn.close-btn:hover {
		background: hsl(var(--destructive-default));
		color: hsl(var(--fg-default));
	}

	/* ===== Body ===== */
	.float-panel-body {
		flex: 1;
		overflow: auto;
	}

	/* ===== Resize Handle ===== */
	.resize-handle {
		position: absolute;
		right: 0;
		bottom: 0;
		width: 16px;
		height: 16px;
		cursor: nwse-resize;
	}

	.resize-handle::before {
		content: '';
		position: absolute;
		right: 3px;
		bottom: 3px;
		width: 8px;
		height: 8px;
		border-right: var(--border-width-thick) solid hsl(var(--fg-muted));
		border-bottom: var(--border-width-thick) solid hsl(var(--fg-muted));
		border-radius: 0 0 var(--radius-xs) 0;
		transition: var(--transition-colors);
	}

	.resize-handle:hover::before {
		border-color: hsl(var(--brand-default));
	}
</style>
