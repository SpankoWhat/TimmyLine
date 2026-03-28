<script lang="ts">
	interface Props {
		loading: boolean;
		getSettingValue: (key: string) => string;
		setSetting: (key: string, value: string) => void;
	}

	let { loading, getSettingValue, setSetting }: Props = $props();

	const CURSOR_PRESETS = [
		{ ms: 5,   label: '5' },
		{ ms: 20,  label: '20' },
		{ ms: 50,  label: '50' },
		{ ms: 100, label: '100' }
	] as const;

	const CURSOR_MSG_BYTES = 210;

	let cursorThrottleMs = $derived(parseInt(getSettingValue('collaboration.cursor_throttle_ms')) || 50);
	let cursorPresetIndex = $derived(CURSOR_PRESETS.findIndex(p => p.ms === cursorThrottleMs));
	let cursorFps = $derived(Math.round((1000 / Math.max(cursorThrottleMs, 1)) * 10) / 10);
	let cursorBwPerUser = $derived(cursorFps * CURSOR_MSG_BYTES);

	function formatBandwidth(bytesPerSec: number): string {
		if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
		return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
	}
</script>

<section class="admin-section">
	<div class="section-header">
		<h2 class="section-title">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon" aria-hidden="true">
				<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 00-3-3.87" />
				<path d="M16 3.13a4 4 0 010 7.75" />
			</svg>
			Collaboration
		</h2>
	</div>

	{#if loading}
		<div class="loading-state">Loading…</div>
	{:else}
		<div class="settings-grid">
			<div class="settings-card">
				<h3 class="card-title">Shared Cursors</h3>
				<p class="card-description">Control how frequently cursor positions are broadcast between analysts viewing the same incident. Lower values feel smoother but use more bandwidth.</p>

				<div class="cursor-rate-row">
					<!-- Step toggle track -->
					<div class="step-track" role="radiogroup" aria-label="Cursor broadcast interval">
						<div class="step-rail"></div>
						{#each CURSOR_PRESETS as preset, i}
							<button
								class="step-stop"
								class:active={cursorPresetIndex === i}
								role="radio"
								aria-checked={cursorPresetIndex === i}
								aria-label="{preset.ms} milliseconds"
								onclick={() => setSetting('collaboration.cursor_throttle_ms', String(preset.ms))}
							>
								<span class="stop-dot"></span>
								<span class="stop-label">{preset.label}<span class="stop-unit">ms</span></span>
							</button>
						{/each}
					</div>

					<!-- Stats -->
					<div class="cursor-stats">
						<div class="stat-cell">
							<span class="stat-label">Rate</span>
							<span class="stat-value">{cursorFps} <span class="stat-unit">fps</span></span>
						</div>
						<div class="stat-cell">
							<span class="stat-label">User Out</span>
							<span class="stat-value">{formatBandwidth(cursorBwPerUser)}</span>
						</div>
						<div class="stat-cell">
							<span class="stat-label">6 Users</span>
							<span class="stat-value">{formatBandwidth(cursorBwPerUser * 6 * 5)}</span>
						</div>
					</div>
				</div>
				<span class="field-hint">Takes effect on next socket connection.</span>
			</div>
		</div>
	{/if}
</section>

<style>
	/* ===== Section Shell ===== */
	.admin-section {
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-5);
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		background: hsl(var(--bg-surface-200));
	}
	.section-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-base);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
	}
	.section-icon {
		width: var(--icon-md);
		height: var(--icon-md);
		color: hsl(var(--fg-light));
		flex-shrink: 0;
	}

	/* ===== Settings Grid ===== */
	.settings-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		padding: var(--space-5);
	}
	.settings-card {
		background: hsl(var(--bg-surface-75));
		border: var(--border-width) solid hsl(var(--border-muted));
		border-radius: var(--radius-md);
		padding: var(--space-4);
	}
	.card-title {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: hsl(var(--fg-default));
		margin-bottom: var(--space-1);
	}
	.card-description {
		font-size: var(--text-xs);
		color: hsl(var(--fg-light));
		margin-bottom: var(--space-4);
		line-height: var(--leading-relaxed);
	}

	/* ===== Cursor Rate Row ===== */
	.cursor-rate-row {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-3) 0;
	}
	.cursor-stats {
		display: flex;
		gap: var(--space-5);
		flex-shrink: 0;
	}
	.stat-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.stat-label {
		font-size: var(--text-2xs);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: hsl(var(--fg-muted));
		white-space: nowrap;
	}
	.stat-value {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		font-family: var(--font-mono);
		color: hsl(var(--fg-default));
		white-space: nowrap;
	}
	.stat-unit {
		font-weight: var(--font-normal);
		color: hsl(var(--fg-lighter));
	}

	/* Step toggle track */
	.step-track {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex: 1;
		min-width: 180px;
		height: 40px;
	}
	.step-rail {
		position: absolute;
		top: 27%;
		left: 2%;
		right: 2%;
		height: 2px;
		background: hsl(var(--border-default));
		pointer-events: none;
	}
	.step-stop {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-1);
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}
	.stop-dot {
		width: 14px;
		height: 14px;
		border-radius: var(--radius-full);
		border: 2px solid hsl(var(--border-default));
		background: hsl(var(--bg-surface-100));
		transition: border-color var(--duration-normal) var(--ease-default),
			background var(--duration-normal) var(--ease-default),
			box-shadow var(--duration-normal) var(--ease-default);
	}
	.step-stop:hover .stop-dot {
		border-color: hsl(var(--fg-lighter));
	}
	.step-stop.active .stop-dot {
		border-color: hsl(var(--brand-default));
		background: hsl(var(--brand-default));
		box-shadow: 0 0 0 3px hsla(var(--brand-default) / 0.25);
	}
	.stop-label {
		font-size: var(--text-2xs);
		font-family: var(--font-mono);
		color: hsl(var(--fg-muted));
		white-space: nowrap;
		transition: color var(--duration-normal) var(--ease-default);
	}
	.step-stop.active .stop-label {
		color: hsl(var(--fg-default));
		font-weight: var(--font-semibold);
	}
	.stop-unit {
		font-size: var(--text-2xs);
		color: hsl(var(--fg-muted));
		font-weight: var(--font-normal);
		margin-left: 1px;
	}

	/* ===== Field Hint ===== */
	.field-hint {
		display: block;
		margin-top: var(--space-1);
		font-size: var(--text-2xs);
		color: hsl(var(--fg-muted));
	}

	/* ===== Loading ===== */
	.loading-state {
		padding: var(--space-8) var(--space-5);
		text-align: center;
		font-size: var(--text-sm);
		color: hsl(var(--fg-muted));
	}
</style>
