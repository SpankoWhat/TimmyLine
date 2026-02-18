<script lang="ts">
	import '$lib/../app.css';
	import type { Snippet } from 'svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import GenericModal from '$lib/components/GenericModal.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="app-layout">
	<Sidebar />
	<main class="main-content">
		{@render children()}
	</main>
</div>

<GenericModal />
<CommandPalette />

<style>
	.app-layout {
		display: flex;
		min-height: 100vh;
		background: hsl(var(--bg-root));
		color: hsl(var(--fg-default));
		font-family: var(--font-family);
	}

	.main-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
