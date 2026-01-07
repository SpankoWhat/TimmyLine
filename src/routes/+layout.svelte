<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { LayoutProps } from './$types';
    import { 
        updateLookupCache,
        setupIncidentWatcher,
        currentSelectedAnalyst
    } from '$lib/stores/cacheStore';
    import type { Analyst } from '$lib/server/database';

    let { data, children }: LayoutProps = $props();
    let unsubscribe: (() => void) | undefined;

    onMount(async () => {
        // Initialize all lookup caches first (runs once for entire app)
        await updateLookupCache();
        
        // Set up the reactive incident watcher
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
                deleted_at: null
            };
            currentSelectedAnalyst.set(sessionAnalyst);
        }
    });

    onDestroy(() => {
        unsubscribe?.();
    });
</script>

{@render children()}