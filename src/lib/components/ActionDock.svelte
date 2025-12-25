<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	type ButtonConfig = {
		label: string;
		id: string;
		variant: 'home' | 'create' | 'relate' | 'config' | 'other';
		items?: Array<{
			label: string;
			action: () => void | Promise<void>;
		}>;
		action?: () => void | Promise<void>;
	};

	type Props = {
		buttons: ButtonConfig[];
		leftSection?: Snippet;
		rightSection?: Snippet;
	};

	let { buttons, leftSection, rightSection }: Props = $props();

	let activeDropdown = $state<string>('');

	function toggleDropdown(id: string) {
		activeDropdown = activeDropdown === id ? '' : id;
	}

	function handleItemClick(action: () => void | Promise<void>) {
		action();
		activeDropdown = '';
	}
</script>

<div class="action-dock">
	<!-- Left Section -->
	<div class="dock-section">
		{#if leftSection}
			{@render leftSection()}
		{:else}
			<button class="action-btn home" onclick={() => goto('/home')} title="Home">Home</button>
		{/if}
	</div>

	<!-- Center Section: Dynamic Buttons -->
	<div class="dock-section">
		{#each buttons as button}
			<div class="dropdown-wrapper">
				<button 
					class="action-btn {button.variant}" 
					onclick={() => button.items ? toggleDropdown(button.id) : button.action?.()}
				>
					{button.label}
				</button>
				
				{#if button.items && activeDropdown === button.id}
					<div class="dropdown-menu">
						{#each button.items as item}
							<button class="dropdown-item" onclick={() => handleItemClick(item.action)}>
								{item.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Right Section -->
	<div class="dock-section">
		{#if rightSection}
			{@render rightSection()}
		{/if}
	</div>
</div>

<style>
	.action-dock {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		gap: var(--spacing-md);
	}

	.dock-section {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.dropdown-wrapper {
		position: relative;
	}

	.action-btn {
		padding: var(--spacing-xs) var(--spacing-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		color: var(--color-text-primary);
		font-weight: var(--font-weight-medium);
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all var(--transition-fast);
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.action-btn:hover {
		background: var(--color-bg-hover);
		border-color: var(--color-accent-primary);
	}

	.action-btn:active {
		transform: scale(0.98);
	}

	.action-btn.home {
		border-color: var(--color-border-subtle);
		color: var(--color-accent-primary);
	}

	.action-btn.create {
		border-color: var(--color-accent-success);
		color: var(--color-accent-success);
	}

	.action-btn.create:hover {
		border-color: var(--color-accent-success);
		background: rgba(52, 211, 153, 0.1);
	}

	.action-btn.relate {
		border-color: var(--color-accent-secondary);
		color: var(--color-accent-secondary);
	}

	.action-btn.relate:hover {
		border-color: var(--color-accent-secondary);
		background: rgba(129, 140, 248, 0.1);
	}

	.action-btn.config {
		border-color: var(--color-accent-warning);
		color: var(--color-accent-warning);
	}

	.action-btn.config:hover {
		border-color: var(--color-accent-warning);
		background: rgba(251, 191, 36, 0.1);
	}

	.action-btn.other {
		border-color: var(--color-border-medium);
		color: var(--color-text-secondary);
	}

	.action-btn.other:hover {
		border-color: var(--color-accent-primary);
		background: rgba(139, 92, 246, 0.1);
	}

	.dropdown-menu {
		position: absolute;
		bottom: calc(100% + var(--spacing-xs));
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		min-width: 180px;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-md);
		overflow: hidden;
		box-shadow: var(--shadow-md);
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: var(--spacing-sm) var(--spacing-md);
		text-align: left;
		color: var(--color-text-primary);
		font-size: var(--font-size-xs);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-border-subtle);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.dropdown-item:last-child {
		border-bottom: none;
	}

	.dropdown-item:hover {
		background: var(--color-bg-hover);
		color: var(--color-accent-primary);
	}
</style>
