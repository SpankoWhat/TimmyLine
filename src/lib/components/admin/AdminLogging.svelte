<script lang="ts">
	interface Props {
		loading: boolean;
		getSettingValue: (key: string) => string;
		setSetting: (key: string, value: string) => void;
		setSettingBool: (key: string, checked: boolean) => void;
		isSettingTrue: (key: string) => boolean;
	}

	let { loading, getSettingValue, setSetting, setSettingBool, isSettingTrue }: Props = $props();
</script>

<section class="admin-section">
	<div class="section-header">
		<h2 class="section-title">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="section-icon" aria-hidden="true">
				<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
				<polyline points="10 9 9 9 8 9" />
			</svg>
			Logging
		</h2>
	</div>

	{#if loading}
		<div class="loading-state">Loading…</div>
	{:else}
		<div class="settings-grid">
			<div class="settings-card">
				<h3 class="card-title">File Logging</h3>
				<p class="card-description">Configure whether logs are written to a file and where. Changes require an app restart.</p>

				<div class="toggle-list">
					<label class="toggle-row">
						<div class="toggle-info">
							<span class="toggle-label">Write Logs to File</span>
							<span class="toggle-hint">When enabled, logs are written to the file path below instead of stdout</span>
						</div>
						<input
							type="checkbox"
							class="toggle-input"
							checked={isSettingTrue('logging.write_to_file')}
							onchange={(e) => setSettingBool('logging.write_to_file', e.currentTarget.checked)}
						/>
					</label>
				</div>

				<div class="field-group">
					<label class="field-label" for="log-path">Log File Path</label>
					<input
						id="log-path"
						type="text"
						class="field-input mono"
						value={getSettingValue('logging.file_path')}
						oninput={(e) => setSetting('logging.file_path', e.currentTarget.value)}
						placeholder="./data/timmyLine.log"
						disabled={!isSettingTrue('logging.write_to_file')}
					/>
					<span class="field-hint">Relative to project root or absolute path</span>
				</div>
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

	/* ===== Toggle Rows ===== */
	.toggle-list {
		display: flex;
		flex-direction: column;
	}
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-2\.5) 0;
		border-bottom: var(--border-width) solid hsl(var(--border-muted));
		cursor: pointer;
	}
	.toggle-row:last-child {
		border-bottom: none;
	}
	.toggle-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.toggle-label {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-default));
	}
	.toggle-hint {
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	/* Toggle switch */
	.toggle-input {
		appearance: none;
		width: 36px;
		height: 20px;
		background: hsl(var(--bg-surface-400));
		border-radius: var(--radius-full);
		position: relative;
		cursor: pointer;
		transition: background var(--duration-normal) var(--ease-default);
		flex-shrink: 0;
	}
	.toggle-input::before {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: hsl(var(--fg-lighter));
		border-radius: var(--radius-full);
		transition: transform var(--duration-normal) var(--ease-default), background var(--duration-normal) var(--ease-default);
	}
	.toggle-input:checked {
		background: hsl(var(--brand-default));
	}
	.toggle-input:checked::before {
		transform: translateX(16px);
		background: hsl(var(--fg-contrast));
	}
	.toggle-input:focus-visible {
		outline: 2px solid hsl(var(--border-focus));
		outline-offset: 2px;
	}

	/* ===== Field Groups ===== */
	.field-group {
		margin-top: var(--space-4);
	}
	.field-label {
		display: block;
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-light));
		margin-bottom: var(--space-1);
	}
	.field-input {
		width: 100%;
		padding: var(--space-2) var(--space-2\.5);
		font-size: var(--text-sm);
		background: hsl(var(--bg-control));
		color: hsl(var(--fg-default));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-sm);
		font-family: var(--font-mono);
		letter-spacing: var(--tracking-mono);
	}
	.field-input:focus {
		outline: none;
		border-color: hsl(var(--border-focus));
	}
	.field-input:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
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
