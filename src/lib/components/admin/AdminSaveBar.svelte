<script lang="ts">
	interface Props {
		hasPendingChanges: boolean;
		pendingCount: number;
		pendingNeedsRestart: boolean;
		settingsSaved: boolean;
		restartRequired: boolean;
		savingSettings: boolean;
		settingsError: string;
		onsave: () => void;
		ondiscard: () => void;
	}

	let {
		hasPendingChanges,
		pendingCount,
		pendingNeedsRestart,
		settingsSaved,
		restartRequired,
		savingSettings,
		settingsError,
		onsave,
		ondiscard
	}: Props = $props();
</script>

{#if hasPendingChanges || settingsSaved}
	<div class="save-bar" class:saved={settingsSaved}>
		{#if settingsSaved}
			<span class="save-message">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
				Settings saved to config file
			</span>
			{#if restartRequired}
				<span class="restart-notice">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
						<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
						<line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
					Server restart required for some changes to take effect
				</span>
			{/if}
		{:else}
			<span class="save-message">
				{pendingCount} unsaved change{pendingCount === 1 ? '' : 's'}
				{#if pendingNeedsRestart}
					<span class="restart-hint">· restart required</span>
				{/if}
			</span>
			<div class="save-actions">
				<button class="btn-secondary" onclick={ondiscard}>Discard</button>
				<button class="btn-primary" onclick={onsave} disabled={savingSettings}>
					{savingSettings ? 'Saving…' : 'Save Changes'}
				</button>
			</div>
		{/if}
	</div>
{/if}

{#if settingsError}
	<div class="error-banner" role="alert">
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true">
			<circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
		</svg>
		{settingsError}
	</div>
{/if}

<style>
	/* ===== Save Bar ===== */
	.save-bar {
		position: sticky;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-3) var(--space-5);
		background: hsl(var(--bg-surface-300));
		border: var(--border-width) solid hsl(var(--border-strong));
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: var(--z-sticky);
	}
	.save-bar.saved {
		border-color: hsl(var(--success-500));
	}
	.save-message {
		display: flex;
		align-items: center;
		gap: var(--space-1\.5);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-default));
	}
	.saved .save-message {
		color: hsl(var(--success-default));
	}
	.save-actions {
		display: flex;
		gap: var(--space-2);
	}
	.btn-secondary {
		padding: var(--space-1\.5) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		background: hsl(var(--bg-surface-200));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.btn-secondary:hover {
		background: hsl(var(--bg-surface-300));
		color: hsl(var(--fg-default));
	}
	.btn-primary {
		padding: var(--space-1\.5) var(--space-3);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-contrast));
		background: hsl(var(--brand-default));
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}
	.btn-primary:hover {
		background: hsl(var(--brand-600));
	}
	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Restart indicators */
	.restart-notice {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--text-xs);
		color: hsl(var(--amber-400, 40 95% 60%));
		margin-left: var(--space-3);
		padding: var(--space-0\.5) var(--space-2);
		background: hsla(var(--amber-400, 40 95% 60%) / 0.1);
		border-radius: var(--radius-sm);
	}
	.restart-hint {
		font-size: var(--text-xs);
		color: hsl(var(--amber-400, 40 95% 60%));
		font-weight: var(--font-normal);
		margin-left: var(--space-1);
	}

	/* ===== Error Banner ===== */
	.error-banner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin: var(--space-3) var(--space-5);
		padding: var(--space-2\.5) var(--space-3);
		background: hsl(var(--destructive-200));
		border: var(--border-width) solid hsl(var(--destructive-400));
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
		color: hsl(var(--destructive-default));
	}
</style>
