<script lang="ts">
	import {
		currentCachedIncidents,
		currentCachedTimelineEvents,
		currentCachedInvestigationActions,
		currentSelectedIncident,
		combinedTimeline
	} from "$lib/stores/cacheStore.js";
    import type { PageProps } from './$types';
    import type { Incident } from '$lib/server/database';
	import TimeLineRow from "$lib/components/TimelineRow.svelte";
	import { onMount } from 'svelte';
    	
    let { data }: PageProps = $props();
    
	// State: Find and set the current incident on mount
	
	onMount(() => {
		// First try to use the incident loaded from the server
		if (data.incident) {
			currentSelectedIncident.set(data.incident as Incident);
		} else {
			// Fallback: try to find in cached incidents (for navigation from within app)
			let incident = $currentCachedIncidents.find((inc) => inc.uuid === data.incidentuuid) as Incident;
			if (incident) {
				currentSelectedIncident.set(incident);
			}
		}
	});
</script>

<!-- Main Container with dark background and gradient -->
<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-green-400 font-mono p-4 md:p-8">
	<div class="max-w-7xl mx-auto space-y-6">
		
		<!-- Terminal Header -->
		<div class="bg-slate-950/50 border-2 border-cyan-500/30 rounded-lg p-4 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
			<div class="flex items-center gap-2 mb-2">
				<div class="flex gap-1.5">
					<div class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
					<div class="w-3 h-3 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
					<div class="w-3 h-3 rounded-full bg-green-500 animate-pulse delay-150"></div>
				</div>
				<span class="text-xs text-slate-500 ml-2">Timeline Terminal v2.0</span>
			</div>
			<div class="text-sm md:text-base">
				<span class="text-cyan-400 font-bold">incident@timeline:~$</span>
				<span class="text-yellow-300 ml-2">viewing --incident=</span>
				<span class="text-white animate-pulse">{$currentSelectedIncident?.title || 'Loading...'}</span>
			</div>
		</div>

		<!-- Timeline Stats Card -->
		<div class="bg-slate-950/40 border-2 border-purple-500/40 rounded-lg p-5 backdrop-blur-sm hover:border-purple-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-2">
					<span class="text-purple-500 text-xl font-bold">{'>'}</span>
					<h2 class="text-base font-bold text-purple-400 uppercase tracking-widest">
						Timeline.Stats
					</h2>
				</div>
				<div class="flex gap-6 text-sm">
					<div class="flex items-center gap-2">
						<span class="text-cyan-500">▸</span>
						<span class="text-slate-400">Total:</span>
						<span class="text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded border border-cyan-500/30">
							{$combinedTimeline.length}
						</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-blue-500">●</span>
						<span class="text-slate-400">Events:</span>
						<span class="text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded border border-blue-500/30">
							{$currentCachedTimelineEvents.length}
						</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-green-500">▸</span>
						<span class="text-slate-400">Actions:</span>
						<span class="text-green-400 font-bold bg-green-500/10 px-3 py-1 rounded border border-green-500/30">
							{$currentCachedInvestigationActions.length}
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Timeline Events Container -->
		<div class="bg-slate-950/40 border-2 border-green-500/40 rounded-lg p-5 backdrop-blur-sm hover:border-green-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
			<div class="flex items-center gap-2 mb-4">
				<span class="text-green-500 text-xl font-bold">{'>'}</span>
				<h2 class="text-base font-bold text-green-400 uppercase tracking-widest">
					Timeline.Events
				</h2>
			</div>

			{#if !$currentSelectedIncident?.uuid}
				<div class="text-center py-12 px-4 bg-slate-900/50 border border-yellow-500/30 rounded">
					<span class="text-yellow-500 text-4xl mb-4 block">⚠</span>
					<p class="text-yellow-300 text-sm">
						<span class="text-yellow-400 font-bold">WARNING:</span> No incident selected
					</p>
					<p class="text-slate-400 text-xs mt-2">
						Select an active incident to view timeline events.
					</p>
				</div>
			{:else if $combinedTimeline.length === 0}
				<div class="text-center py-12 px-4 bg-slate-900/50 border border-cyan-500/30 rounded">
					<span class="text-cyan-500 text-4xl mb-4 block">📊</span>
					<p class="text-cyan-300 text-sm">
						<span class="text-cyan-400 font-bold">INFO:</span> No timeline data found
					</p>
					<p class="text-slate-400 text-xs mt-2">
						No timeline events or investigation actions found for this incident.
					</p>
				</div>
			{:else}
				<div class="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/50 scrollbar-track-slate-900 pr-2">
					{#each $combinedTimeline as item}
						<TimeLineRow {item} />
					{/each}
				</div>
			{/if}
		</div>

	</div>
</div>

<style>
	/* Custom scrollbar styling */
	:global(.scrollbar-thin) {
		scrollbar-width: thin;
	}

	:global(.scrollbar-thumb-green-500\/50::-webkit-scrollbar) {
		width: 8px;
	}

	:global(.scrollbar-thumb-green-500\/50::-webkit-scrollbar-track) {
		background: rgba(15, 23, 42, 0.5);
		border-radius: 4px;
	}

	:global(.scrollbar-thumb-green-500\/50::-webkit-scrollbar-thumb) {
		background: rgba(34, 197, 94, 0.5);
		border-radius: 4px;
	}

	:global(.scrollbar-thumb-green-500\/50::-webkit-scrollbar-thumb:hover) {
		background: rgba(34, 197, 94, 0.7);
	}

	/* Animation delays */
	:global(.delay-75) {
		animation-delay: 75ms;
	}

	:global(.delay-150) {
		animation-delay: 150ms;
	}
</style>
