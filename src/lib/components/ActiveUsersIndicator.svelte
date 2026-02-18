<script lang="ts">
	import { userNamesInCurrentIncident } from '$lib/stores/collabStore';
	import { currentSelectedIncident } from '$lib/stores/cacheStore';

	let users = $derived($userNamesInCurrentIncident);
	let incident = $derived($currentSelectedIncident);

	/**
	 * Generate a deterministic HSL color from a string (username).
	 * Produces warm, readable hues against dark backgrounds.
	 */
	function colorFromString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = ((hash % 360) + 360) % 360;
		return `hsl(${hue}, 55%, 50%)`;
	}
</script>

{#if incident && users.length > 0}
	<div class="presence-indicator">
		<div class="presence-stack">
			{#each users.slice(0, 3) as name (name)}
				<div class="avatar avatar-sm" style:background-color={colorFromString(name)} title={name}>
					{name.charAt(0).toUpperCase()}
				</div>
			{/each}
		</div>
		{#if users.length > 3}
			<span class="presence-count">+{users.length - 3}</span>
		{/if}
		<span class="presence-label">{users.length} viewing</span>
	</div>
{/if}

<style>
	.presence-indicator {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.presence-stack {
		display: flex;
		align-items: center;
	}

	.presence-stack .avatar {
		margin-left: -6px;
		border: var(--border-width-thick) solid hsl(var(--bg-root));
	}

	.presence-stack .avatar:first-child {
		margin-left: 0;
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background: hsl(var(--bg-surface-300));
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-2xs);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-light));
		overflow: hidden;
		flex-shrink: 0;
	}

	.avatar-sm {
		width: 20px;
		height: 20px;
		font-size: 8px;
	}

	.presence-count {
		margin-left: var(--space-1);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.presence-label {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
		margin-left: var(--space-2);
	}
</style>
