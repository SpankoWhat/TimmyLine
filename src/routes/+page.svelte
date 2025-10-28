<script lang="ts">
	import type { PageProps } from './$types';
	import {incidentStats, currentSelectedAnalyst, currentSelectedIncident, currentCachedIncidents, actionTypes} from '$lib/stores/cacheStore';
	import type { Incident } from '$lib/server/database';
	import { goto } from '$app/navigation';

	let { data }: PageProps = $props();

	function userSelectedIncident(incident: Incident) {
		$currentSelectedIncident = incident;
		console.log("Main - User selected incident:", incident);
		goto(`/incident/${incident.uuid}`);
	}

</script>

<!-- Main Container with dark background and gradient -->
<div class="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-green-400 font-mono p-4 md:p-8">
	<div class="max-w-7xl mx-auto space-y-6">
		
		<!-- Terminal Header -->
		<div class="bg-slate-950/50 border-2 border-green-500/30 rounded-lg p-4 backdrop-blur-sm shadow-lg shadow-green-500/10">
			<div class="flex items-center gap-2 mb-2">
				<div class="flex gap-1.5">
					<div class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
					<div class="w-3 h-3 rounded-full bg-yellow-500 animate-pulse delay-75"></div>
					<div class="w-3 h-3 rounded-full bg-green-500 animate-pulse delay-150"></div>
				</div>
				<span class="text-xs text-slate-500 ml-2">TimViZ Terminal v2.0</span>
			</div>
			<div class="text-sm md:text-base">
				<span class="text-green-400 font-bold">analyst@timviz:~$</span>
				<span class="text-cyan-400 ml-2">init --user=</span>
				<span class="text-yellow-300 animate-pulse">{$currentSelectedAnalyst?.full_name}</span>
			</div>
		</div>

		<!-- Statistics Dashboard -->
		<div class="grid md:grid-cols-2 gap-4">
			<!-- Priority Alerts Card -->
			<div class="bg-slate-950/40 border-2 border-red-500/40 rounded-lg p-5 backdrop-blur-sm hover:border-red-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 group">
				<div class="flex items-center gap-2 mb-4">
					<span class="text-red-500 text-xl">⚠</span>
					<h3 class="text-sm font-bold text-red-400 uppercase tracking-wider">
						[ Priority Alerts ]
					</h3>
				</div>
				<div class="space-y-3 pl-4 border-l-2 border-red-500/30 group-hover:border-red-500/60 transition-colors">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-red-500 font-bold">●</span>
							<span class="text-red-300 text-sm">Critical</span>
						</div>
						<span class="text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded">{$incidentStats.critical || "—"}</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-yellow-500 font-bold">●</span>
							<span class="text-yellow-300 text-sm">High</span>
						</div>
						<span class="text-yellow-400 font-bold bg-yellow-500/10 px-3 py-1 rounded">{$incidentStats.high || "—"}</span>
					</div>
				</div>
			</div>

			<!-- Incident Metrics Card -->
			<div class="bg-slate-950/40 border-2 border-cyan-500/40 rounded-lg p-5 backdrop-blur-sm hover:border-cyan-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 group">
				<div class="flex items-center gap-2 mb-4">
					<span class="text-cyan-500 text-xl">📊</span>
					<h3 class="text-sm font-bold text-cyan-400 uppercase tracking-wider">
						[ Incident Metrics ]
					</h3>
				</div>
				<div class="space-y-3 pl-4 border-l-2 border-cyan-500/30 group-hover:border-cyan-500/60 transition-colors">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-cyan-500">▸</span>
							<span class="text-cyan-300 text-sm">Total Incidents</span>
						</div>
						<span class="text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded">{$incidentStats.total || "—"}</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-cyan-500">▸</span>
							<span class="text-cyan-300 text-sm">In Progress</span>
						</div>
						<span class="text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded">{$incidentStats.inProgress || "—"}</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-cyan-500">▸</span>
							<span class="text-cyan-300 text-sm">Closed Cases</span>
						</div>
						<span class="text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded">{$incidentStats.closed || "—"}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Recent Incidents -->
		<div class="bg-slate-950/40 border-2 border-green-500/40 rounded-lg p-5 backdrop-blur-sm hover:border-green-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
			<div class="flex items-center gap-2 mb-4">
				<span class="text-green-500 text-xl font-bold">{'>'}</span>
				<h2 class="text-base font-bold text-green-400 uppercase tracking-widest">
					Recent.Incidents
				</h2>
			</div>
			<div class="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-green-500/50 scrollbar-track-slate-900">
				{#each $currentCachedIncidents as incident, i}
					<div class="flex items-start gap-3 p-3 bg-slate-900/50 border border-green-500/20 rounded hover:border-green-500/50 hover:bg-slate-900/70 transition-all duration-200 group">
						<span class="text-green-500 mt-1 group-hover:animate-pulse">{String(i + 1).padStart(2, '0')}</span>
						<div class="flex-1 min-w-0" onclick={()=>userSelectedIncident(incident)}>
							<p class="text-white font-semibold text-sm truncate group-hover:text-green-300 transition-colors">
								{incident.title}
							</p>
							<div class="flex flex-wrap items-center gap-2 mt-1 text-xs">
								<span class="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded">
									{incident.status}
								</span>
								<span class="text-slate-400">•</span>
								<span class="text-slate-400">{incident.created_at}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Bottom Grid: Health Status & Action Types -->
		<div class="grid lg:grid-cols-2 gap-4">
			<!-- System Health -->
			<div class="bg-slate-950/40 border-2 border-emerald-500/40 rounded-lg p-5 backdrop-blur-sm hover:border-emerald-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20">
				<div class="flex items-center gap-2 mb-4">
					<span class="text-emerald-500 text-xl font-bold">{'>'}</span>
					<h2 class="text-base font-bold text-emerald-400 uppercase tracking-widest">
						System.Health
					</h2>
				</div>
				<div class="space-y-3 bg-slate-900/50 border border-emerald-500/20 rounded p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-emerald-500">▸</span>
							<span class="text-emerald-300 text-sm">Database</span>
						</div>
						<span class="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/30">
							{data.health.database}
						</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-emerald-500">▸</span>
							<span class="text-emerald-300 text-sm">Status</span>
						</div>
						<span class="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/30 flex items-center gap-2">
							<span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
							{data.health.status}
						</span>
					</div>
					{#if data.health.error}
						<div class="flex items-start gap-2 mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded">
							<span class="text-red-500">⚠</span>
							<div class="flex-1">
								<span class="text-red-300 text-sm font-semibold">Error:</span>
								<p class="text-red-400 text-xs mt-1">{data.health.error}</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Action Types -->
			<div class="bg-slate-950/40 border-2 border-purple-500/40 rounded-lg p-5 backdrop-blur-sm hover:border-purple-500/60 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
				<div class="flex items-center gap-2 mb-4">
					<span class="text-purple-500 text-xl font-bold">{'>'}</span>
					<h2 class="text-base font-bold text-purple-400 uppercase tracking-widest">
						Action.Types
					</h2>
				</div>
				<div class="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-slate-900">
					{#each $actionTypes as action_type}
						<div class="flex items-start gap-2 p-2 bg-slate-900/50 border border-purple-500/20 rounded hover:border-purple-500/50 hover:bg-slate-900/70 transition-all duration-200 group">
							<span class="text-purple-500 mt-0.5 group-hover:animate-pulse">▸</span>
							<div class="flex-1 min-w-0">
								<p class="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors">
									{action_type.name}
								</p>
								<p class="text-slate-400 text-xs mt-0.5 line-clamp-2">
									{action_type.description}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

	</div>
</div>
