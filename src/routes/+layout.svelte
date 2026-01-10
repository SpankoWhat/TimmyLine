<script lang="ts">
    import { onMount, onDestroy, setContext } from 'svelte';
    import type { LayoutProps } from './$types';
    import { 
        updateLookupCache,
        setupIncidentWatcher,
        currentSelectedAnalyst
    } from '$lib/stores/cacheStore';
    import { 
        initializeSocket, 
        disconnectSocket,
        incidentUserCounts
    } from '$lib/stores/collabStore';
    import type { Analyst } from '$lib/server/database';

    let { data, children }: LayoutProps = $props();
    let unsubscribe: (() => void) | undefined;
    
    // Reactive state for socket connection and user counts
    let socketConnected = $state(false);
    let lobbyUserCounts = $state(new Map());
    
    // Subscribe to incident user counts from socket
    $effect(() => {
        const unsubscribeCounts = incidentUserCounts.subscribe((counts) => {
            lobbyUserCounts = counts;
        });
        
        return unsubscribeCounts;
    });
    
    // Make socket state available to child components via context
    setContext('socketState', () => ({ 
        connected: socketConnected,
        lobbyUserCounts 
    }));

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
            
            // Initialize socket connection after analyst is validated
            const socketResult = initializeSocket();
            if (socketResult) {
                socketConnected = true;
                console.log('Socket.IO initialized in root layout');
            } else {
                console.error('Failed to initialize socket in root layout');
            }
        }
    });

    onDestroy(() => {
        unsubscribe?.();
        
        // Disconnect socket when app unmounts
        if (socketConnected) {
            disconnectSocket();
            socketConnected = false;
        }
    });
</script>

{@render children()}