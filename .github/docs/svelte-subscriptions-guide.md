# Svelte Store Subscriptions & Lifecycle Management

A comprehensive guide to understanding subscriptions, cleanup, and memory management in Svelte.

---

## Table of Contents

1. [What Are Subscriptions?](#what-are-subscriptions)
2. [The Memory Leak Problem](#the-memory-leak-problem)
3. [The Solution: Unsubscribe](#the-solution-unsubscribe)
4. [Component Lifecycle](#component-lifecycle)
5. [Auto-Cleanup with `$` Prefix](#auto-cleanup-with--prefix)
6. [Manual vs Automatic Cleanup](#manual-vs-automatic-cleanup)
7. [Best Practices](#best-practices)

---

## What Are Subscriptions?

When you call `.subscribe()` on a Svelte store, you're saying "tell me every time this value changes":

```typescript
const unsubscribe = currentSelectedIncident.subscribe((incident) => {
    console.log('Incident changed to:', incident);
    // Do something with the new value
});
```

**Important**: This callback runs **forever** until you manually stop it. If you never stop it, it's a **memory leak**.

---

## The Memory Leak Problem

Imagine this scenario without proper cleanup:

```typescript
// User opens your app
setupIncidentWatcher(); // Creates subscription #1

// User refreshes the page
setupIncidentWatcher(); // Creates subscription #2 (but #1 is still running!)

// User refreshes again
setupIncidentWatcher(); // Creates subscription #3 (now you have 3 callbacks!)
```

**Result**: Each time the store changes, all 3 callbacks run. Your app gets slower and slower, consuming more memory. 💥

### Why This Happens

- Subscriptions exist in memory even after components are destroyed
- Each subscription holds references to functions and data
- Multiple subscriptions = multiple callbacks executing on every store change
- Browser can't garbage collect because references still exist

---

## The Solution: Unsubscribe

The `.subscribe()` function **returns** a cleanup function:

```typescript
const unsubscribe = myStore.subscribe((value) => {
    console.log(value);
});

// Later, when you're done:
unsubscribe(); // ✅ Stops listening, frees memory
```

### What Happens When You Unsubscribe

1. Removes the callback from the store's listener list
2. Breaks references, allowing garbage collection
3. Prevents the callback from running on future updates
4. Frees memory associated with the subscription

---

## Component Lifecycle

### The Full Lifecycle Pattern

```typescript
let unsubscribe: (() => void) | undefined;
// ↑ Variable to store the cleanup function
// Type: a function that takes no params and returns nothing
// Or undefined (before onMount runs)

onMount(async () => {
    // 1. Component is mounted to the DOM
    console.log('Component mounted');
    
    // 2. Load initial data
    await initializeAllCaches();
    
    // 3. Start watching for changes
    unsubscribe = setupIncidentWatcher();
    // ↑ Save the cleanup function for later
    
    console.log('Subscription created');
});

onDestroy(() => {
    // 4. Component is being removed from DOM
    console.log('Component destroyed');
    
    // 5. Clean up subscription
    unsubscribe?.();
    // ↑ The ?. means "only call if it exists"
    // Prevents errors if onMount never ran
    
    console.log('Subscription cleaned up');
});
```

### When `onDestroy` Runs

- User navigates away from the page
- Component gets removed from the DOM
- App refreshes/closes
- Parent component unmounts
- Hot module reload during development

---

## Auto-Cleanup with `$` Prefix

**The Magic**: When you use `$storeName` in a component, Svelte automatically handles subscription and cleanup!

```svelte
<script>
    import { currentSelectedIncident } from '$lib/stores/cacheStore';
    
    // This auto-subscribes AND auto-unsubscribes! ✨
    console.log($currentSelectedIncident);
</script>

<p>{$currentSelectedIncident?.title}</p>
```

### What Svelte Does Behind the Scenes

```typescript
// You write:
$currentSelectedIncident

// Svelte compiles it to roughly:
let unsubscribe;
let currentSelectedIncidentValue;

onMount(() => {
    unsubscribe = currentSelectedIncident.subscribe(value => {
        currentSelectedIncidentValue = value;
        // Trigger component re-render
    });
});

onDestroy(() => {
    unsubscribe();
});
```

### When to Use `$` Prefix

✅ **Use `$` when:**
- Displaying store values in templates
- Simple reactive statements
- Reading values in component logic
- You want automatic cleanup

```svelte
<script>
    import { incidentStats } from '$lib/stores/cacheStore';
    
    // All of these auto-cleanup:
    console.log($incidentStats.total);
    
    $: if ($incidentStats.critical > 5) {
        console.log('High critical count!');
    }
</script>

<div>Total: {$incidentStats.total}</div>
```

---

## Manual vs Automatic Cleanup

### Manual Cleanup Required

You need manual cleanup when:

1. **Creating subscriptions in functions**
```typescript
function setupWatcher() {
    return someStore.subscribe((value) => {
        // Custom logic
    });
}

onMount(() => {
    const unsubscribe = setupWatcher();
    return () => unsubscribe(); // Cleanup
});
```

2. **Module-level subscriptions** (AVOID THIS!)
```typescript
// ❌ BAD - Runs on both server and client, never cleaned up
someStore.subscribe((value) => {
    console.log(value);
});
```

3. **Complex subscription logic**
```typescript
onMount(() => {
    const unsubscribe1 = store1.subscribe(handleStore1);
    const unsubscribe2 = store2.subscribe(handleStore2);
    
    return () => {
        unsubscribe1();
        unsubscribe2();
    };
});
```

### Automatic Cleanup

Svelte handles cleanup automatically when:

1. **Using `$` prefix in components**
```svelte
<div>{$myStore.value}</div>
```

2. **Using `$effect` in Svelte 5**
```typescript
$effect(() => {
    console.log($myStore); // Auto-cleanup!
});
```

3. **Reactive statements with `$:`**
```typescript
$: console.log($myStore.value); // Auto-cleanup!
```

---

## Best Practices

### ✅ DO

1. **Use `$` prefix for simple value access**
```svelte
<script>
    import { incidents } from '$lib/stores/cacheStore';
</script>
<p>Count: {$incidents.length}</p>
```

2. **Clean up manual subscriptions**
```typescript
let unsubscribe: (() => void) | undefined;

onMount(() => {
    unsubscribe = setupWatcher();
});

onDestroy(() => {
    unsubscribe?.();
});
```

3. **Initialize stores in components**
```typescript
onMount(async () => {
    await initializeAllCaches();
    unsubscribe = setupIncidentWatcher();
});
```

4. **Use optional chaining for safety**
```typescript
unsubscribe?.(); // Won't error if undefined
```

### ❌ DON'T

1. **Don't create module-level subscriptions**
```typescript
// ❌ BAD - Memory leak + server/client issues
currentSelectedIncident.subscribe((incident) => {
    updateCache(incident);
});
```

2. **Don't forget to unsubscribe**
```typescript
// ❌ BAD - Memory leak
onMount(() => {
    myStore.subscribe(handleValue);
    // Missing cleanup!
});
```

3. **Don't use browser APIs in module scope**
```typescript
// ❌ BAD - Will error on server
const unsubscribe = myStore.subscribe((value) => {
    window.localStorage.setItem('key', value); // window is undefined on server
});
```

4. **Don't create subscriptions in loops without cleanup**
```typescript
// ❌ BAD - Creates many subscriptions
items.forEach(item => {
    store.subscribe(value => console.log(item, value));
    // No cleanup!
});
```

---

## Real-World Example: Our Project

### Store File (`cacheStore.ts`)

```typescript
import { writable } from 'svelte/store';

export const currentSelectedIncident = writable(null);

// Export a helper that returns cleanup function
export function setupIncidentWatcher() {
    return currentSelectedIncident.subscribe((incident) => {
        if (incident?.uuid) {
            updateIncidentCache(incident);
        } else if (incident === null) {
            clearIncidentCaches();
        }
    });
}
```

### Layout Component (`+layout.svelte`)

```svelte
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { initializeAllCaches, setupIncidentWatcher } from '$lib/stores/cacheStore';
    
    let { children } = $props();
    let unsubscribe: (() => void) | undefined;
    
    onMount(async () => {
        // Load data first
        await initializeAllCaches();
        
        // Set up reactive watcher
        unsubscribe = setupIncidentWatcher();
    });
    
    onDestroy(() => {
        // Clean up when layout unmounts
        unsubscribe?.();
    });
</script>

{@render children?.()}
```

### Page Component (`+page.svelte`)

```svelte
<script lang="ts">
    import { incidentStats, currentCachedIncidents } from '$lib/stores/cacheStore';
    
    // No manual cleanup needed - $ prefix handles it!
</script>

<div>
    <p>Total: {$incidentStats.total}</p>
    <p>Critical: {$incidentStats.critical}</p>
    
    {#each $currentCachedIncidents as incident}
        <div>{incident.title}</div>
    {/each}
</div>
```

---

## Analogy: The Phone Call

Think of subscriptions like phone calls:

- **Subscribe** = Dial the number 📞
- **Callback** = The conversation happening
- **Unsubscribe** = Hang up 📴
- **onDestroy** = "When I leave the room, remember to hang up all my calls!"
- **Memory Leak** = Leaving 100 calls running in the background

Without hanging up, all your old calls stay connected and drain your battery! 🔋

---

## SvelteKit-Specific Considerations

### Server vs Client Execution

SvelteKit runs code on both server and client. Be careful with subscriptions:

```typescript
import { browser } from '$app/environment';

// Only run on client
if (browser) {
    const unsubscribe = myStore.subscribe(handleValue);
}
```

### Relative URLs in Stores

```typescript
// ❌ BAD - Fails on server (no URL context)
fetch('/api/data');

// ✅ GOOD - Only fetch in browser
if (browser) {
    fetch('/api/data');
}

// ✅ BETTER - Only call from component (always in browser context)
onMount(() => {
    initializeAllCaches();
});
```

### Shared State Warning

From SvelteKit docs:
> "On the server, stores are **shared across all requests**. This means if User A sets a value, User B might see it!"

**Solution**: Initialize stores in components (client-side) or use context-based stores for per-user state.

---

## Quick Reference

| Pattern | Auto-Cleanup? | Use Case |
|---------|---------------|----------|
| `$storeName` | ✅ Yes | Simple value access |
| `$effect(() => $store)` | ✅ Yes | Reactive effects (Svelte 5) |
| `$: console.log($store)` | ✅ Yes | Reactive statements |
| `store.subscribe(...)` | ❌ No | Custom logic, need manual cleanup |
| Module-level subscription | ❌ No | ⚠️ AVOID - Memory leaks |

---

## Additional Resources

- [Svelte Store Documentation](https://svelte.dev/docs/svelte-store)
- [SvelteKit State Management](https://kit.svelte.dev/docs/state-management)
- [Svelte Lifecycle Hooks](https://svelte.dev/docs/svelte#onmount)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/what-are-runes)

---

**Last Updated**: October 24, 2025
**Project**: TimmyLine
