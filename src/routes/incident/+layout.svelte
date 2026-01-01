<script lang="ts">
	// Core stuff
	import "$lib/../app.css";
	import { onMount, onDestroy, setContext } from 'svelte';
	
	// Stores
	import { 
		updateLookupCache,
		setupIncidentWatcher,
		currentSelectedAnalyst,
		currentSelectedIncident,
	} from '$lib/stores/cacheStore';
	import GenericModal from '$lib/components/GenericModal.svelte';
	import type { Analyst } from '$lib/server/database';
	
	// Local Props and State
	let { children, data } = $props();
	let unsubscribe: (() => void) | undefined;

	// Dynamic HUD Info 
	let dynamicComponents = $state<Record<string, any>>({});
	type supportedSections = 'stats' | 'actions' | 'userActivity';

	setContext('dynamicLayoutSlots', {
		register: (section: supportedSections, component: any) => {
			dynamicComponents[section] = component;
		},
		unregister: (section: supportedSections) => {
			dynamicComponents[section] = null;
		},
	});

	onMount(async () => {
		// Initialize all caches first
		await updateLookupCache();
		
		// Then set up the reactive incident watcher
		unsubscribe = setupIncidentWatcher();

		// Set current analyst from authenticated session
		if (data.session?.user?.analystUUID) {
			const sessionAnalyst: Analyst = {
				uuid: data.session.user.analystUUID,
				user_id: null,
				username: data.session.user.analystUsername || data.session.user.email?.split('@')[0] || 'Unknown',
				email: data.session.user.email || null,
				full_name: data.session.user.name || data.session.user.analystUsername || 'Unknown User',
				role: data.session.user.analystRole as 'analyst' | 'on-point lead' | 'observer' || 'analyst',
				active: true,
				created_at: null,
				updated_at: null,
				deleted_at: null,
			};
			currentSelectedAnalyst.set(sessionAnalyst);
		}
	});
	
	onDestroy(() => {
		unsubscribe?.();
	});
	
</script>

<!-- Generic Modal -->
<GenericModal />

{@render children?.()}

<div class="header">
	<div class="header-info">
		<span class="header-label">Analyst:</span>
		<span class="header-value">{$currentSelectedAnalyst?.full_name || 'Not Selected'}</span>
	</div>
	<div class="header-info">
		<span class="header-label">Incident:</span>
		<span class="header-value">{$currentSelectedIncident?.title || 'Not Selected'}</span>
	</div>
	
	<!-- Active Users Indicator - section -->
	{#if dynamicComponents.userActivity}
		<div>
			{@render dynamicComponents.userActivity?.() }
		</div>
	{/if}

	<!-- Current page Statistics - section -->
	 {#if dynamicComponents.stats}
		<div class="stats-info">
			{@render dynamicComponents.stats?.() }
		</div>
	{/if}
</div>


<!-- Action Dock - section -->
<div class="action-dock">
	 {#if dynamicComponents.actions}
		{@render dynamicComponents.actions?.() }
	{/if}
</div>

<style>
	.action-dock {
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 2rem;
		background: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border-medium);
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-xs) var(--spacing-md);
		z-index: 100;
	}

	.header {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		padding: var(--spacing-xs) var(--spacing-sm);
		display: flex;
		justify-content: left;
		overflow-y: hidden;
	}

	.header-info {
		display: flex;
		padding-left: var(--spacing-xs);
		padding-right: var(--spacing-xs);
		align-items: center;
		gap: var(--spacing-xs);
		font-size: var(--font-size-sm);
	}

	.header-label {
		color: var(--color-text-tertiary);
	}

	.header-value {
		color: var(--color-accent-primary);
		font-weight: var(--font-weight-medium);
	}

	.stats-info {
		display: flex;
		gap: var(--spacing-sm);
		align-self: center;
		margin-left: auto;
	}
</style>
