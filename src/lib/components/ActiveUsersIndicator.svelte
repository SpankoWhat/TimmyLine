<script lang="ts">
	import { userNamesInCurrentIncident } from '$lib/stores/collabStore';
	import { currentSelectedIncident } from '$lib/stores/cacheStore';
</script>

{#if $currentSelectedIncident && $userNamesInCurrentIncident.length > 0}
	<div class="active-users-indicator">
		<span class="header-label">Users Viewing: </span>
		<span class="header-value">{$userNamesInCurrentIncident.length}</span>
		<div class="users-tooltip">
			{#each $userNamesInCurrentIncident as userName}
				<div class="tooltip-user">
					<div class="divider">| </div>
					 <span class="user-name">{userName} </span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.active-users-indicator {
		display: flex;
		flex-direction: row;
		padding-left: var(--spacing-xs);
		padding-right: var(--spacing-xs);
		align-items: center;
		gap: var(--spacing-xs);
		font-size: var(--font-size-sm);
		transition: all 0.2s ease;
	}

	.header-label {
		color: var(--color-text-tertiary);
	}

	.header-value {
		color: var(--color-accent-primary);
		font-weight: var(--font-weight-medium);
	}

	.active-users-indicator:hover {
		border-color: var(--color-accent-primary);
	}

	.active-users-indicator:hover .users-tooltip {
		opacity: 1;
		visibility: visible;
	}

	.users-tooltip {
		opacity: 0;
		display: flex;
		flex-direction: row;
		visibility: hidden;
		transition: all 0.2s ease;
	}

	.tooltip-user {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.user-name {
		font-size: var(--font-size-sm);
	}
</style>
