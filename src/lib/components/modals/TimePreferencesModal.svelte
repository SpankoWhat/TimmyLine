<script lang="ts">
	import {
		ABSOLUTE_TIME_FORMATS,
		TIME_DISPLAY_MODES,
		formatTimestampForUi,
		type AbsoluteTimeFormat,
		type TimeDisplayMode
	} from '$lib/utils/dateTime';
	import {
		defaultTimePreferences,
		resetTimePreferences,
		timePreferences,
		updateTimePreferences
	} from '$lib/stores/timePreferencesStore';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();

	const FALLBACK_TIMEZONES = [
		'UTC',
		'Etc/UTC',
		'Africa/Johannesburg',
		'America/Chicago',
		'America/Denver',
		'America/Los_Angeles',
		'America/New_York',
		'America/Phoenix',
		'America/Sao_Paulo',
		'Asia/Dubai',
		'Asia/Hong_Kong',
		'Asia/Kolkata',
		'Asia/Singapore',
		'Asia/Tokyo',
		'Australia/Perth',
		'Australia/Sydney',
		'Europe/Amsterdam',
		'Europe/Berlin',
		'Europe/London',
		'Europe/Madrid',
		'Europe/Paris',
		'Europe/Warsaw',
		'Pacific/Auckland'
	] as const;

	const ABSOLUTE_FORMAT_LABELS: Record<AbsoluteTimeFormat, string> = {
		'iso-like': 'ISO-like (YYYY-MM-DD HH:mm:ss TZ)',
		'locale-short': 'Localized (date + short time)',
		'utc-fixed': 'Fixed UTC (YYYY-MM-DD HH:mm:ss UTC)'
	};

	const DISPLAY_MODE_LABELS: Record<TimeDisplayMode, string> = {
		absolute: 'Absolute',
		relative: 'Relative'
	};

	type TimeZoneOptionsResult = {
		values: string[];
		source: 'supported' | 'fallback';
	};

	let timeZoneOptions = $state<string[]>([]);
	let timeZoneSource = $state<'supported' | 'fallback'>('fallback');

	let isDefaults = $derived(
		$timePreferences.timezone === defaultTimePreferences.timezone &&
			$timePreferences.absoluteFormat === defaultTimePreferences.absoluteFormat &&
			$timePreferences.displayMode === defaultTimePreferences.displayMode &&
			$timePreferences.showTooltipAlternate === defaultTimePreferences.showTooltipAlternate
	);

	let previewAbsolute = $derived(
		formatTimestampForUi(
			Math.floor(Date.now() / 1000),
			{ ...$timePreferences, displayMode: 'absolute' },
			{ nowEpochSeconds: Math.floor(Date.now() / 1000) }
		).text
	);

	let previewRelative = $derived(
		formatTimestampForUi(
			Math.floor(Date.now() / 1000),
			{ ...$timePreferences, displayMode: 'relative' },
			{ nowEpochSeconds: Math.floor(Date.now() / 1000) }
		).text
	);

	function getTimeZoneOptions(): TimeZoneOptionsResult {
		const withCurrent = new Set<string>([$timePreferences.timezone, ...FALLBACK_TIMEZONES]);
		const intlWithSupportedValues = Intl as typeof Intl & {
			supportedValuesOf?: (key: 'timeZone') => string[];
		};

		if (typeof intlWithSupportedValues.supportedValuesOf === 'function') {
			try {
				const supported = intlWithSupportedValues.supportedValuesOf('timeZone');
				for (const tz of supported) {
					withCurrent.add(tz);
				}

				return {
					values: Array.from(withCurrent).sort((a, b) => a.localeCompare(b)),
					source: 'supported'
				};
			} catch {
				// Fall through to fallback values.
			}
		}

		return {
			values: Array.from(withCurrent).sort((a, b) => a.localeCompare(b)),
			source: 'fallback'
		};
	}

	$effect(() => {
		if (timeZoneOptions.length > 0) return;
		const result = getTimeZoneOptions();
		timeZoneOptions = result.values;
		timeZoneSource = result.source;
	});

	$effect(() => {
		const timezone = $timePreferences.timezone;
		if (!timezone || timeZoneOptions.includes(timezone)) return;
		timeZoneOptions = [timezone, ...timeZoneOptions].sort((a, b) => a.localeCompare(b));
	});

	function handleTimezoneChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement | null;
		if (!select) return;
		updateTimePreferences({ timezone: select.value });
	}

	function handleAbsoluteFormatChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement | null;
		if (!select) return;
		updateTimePreferences({ absoluteFormat: select.value as AbsoluteTimeFormat });
	}

	function handleDisplayModeChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement | null;
		if (!select) return;
		updateTimePreferences({ displayMode: select.value as TimeDisplayMode });
	}

	function handleTooltipToggle(event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		if (!input) return;
		updateTimePreferences({ showTooltipAlternate: input.checked });
	}

	function handleBackdropClick() {
		onclose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="modal"
		onclick={(event) => event.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-label="Quick time preferences"
		tabindex="-1"
	>
		<header class="modal-header">
			<div class="header-copy">
				<h2 class="modal-title">Quick Time Preferences</h2>
				<p class="modal-description">Adjust how timestamps render across timeline views.</p>
			</div>
			<button type="button" class="btn-icon" aria-label="Close modal" onclick={onclose}>
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
				</svg>
			</button>
		</header>

		<div class="modal-body">
			<div class="field field-full">
				<label class="label" for="quick-timezone">Timezone</label>
				<select id="quick-timezone" class="input mono" value={$timePreferences.timezone} onchange={handleTimezoneChange}>
					{#if timeZoneOptions.length === 0}
						<option value={$timePreferences.timezone}>{$timePreferences.timezone}</option>
					{:else}
						{#each timeZoneOptions as timezone (timezone)}
							<option value={timezone}>{timezone}</option>
						{/each}
					{/if}
				</select>
				<p class="field-hint">
					{#if timeZoneSource === 'supported'}
						Loaded from <code>Intl.supportedValuesOf('timeZone')</code>.
					{:else}
						Using fallback timezone list.
					{/if}
				</p>
			</div>

			<div class="field-grid">
				<div class="field">
					<label class="label" for="quick-absolute-format">Absolute Format</label>
					<select
						id="quick-absolute-format"
						class="input"
						value={$timePreferences.absoluteFormat}
						onchange={handleAbsoluteFormatChange}
					>
						{#each ABSOLUTE_TIME_FORMATS as format (format)}
							<option value={format}>{ABSOLUTE_FORMAT_LABELS[format]}</option>
						{/each}
					</select>
				</div>

				<div class="field">
					<label class="label" for="quick-display-mode">Display Mode</label>
					<select
						id="quick-display-mode"
						class="input"
						value={$timePreferences.displayMode}
						onchange={handleDisplayModeChange}
					>
						{#each TIME_DISPLAY_MODES as mode (mode)}
							<option value={mode}>{DISPLAY_MODE_LABELS[mode]}</option>
						{/each}
					</select>
				</div>
			</div>

			<label class="toggle-row" for="quick-tooltip-toggle">
				<input
					id="quick-tooltip-toggle"
					type="checkbox"
					checked={$timePreferences.showTooltipAlternate}
					onchange={handleTooltipToggle}
				/>
				<span class="toggle-copy">
					<span class="toggle-title">Show alternate timestamp in tooltip</span>
					<span class="toggle-description">
						When enabled, relative timestamps show absolute time on hover and vice versa.
					</span>
				</span>
			</label>

			<div class="preview">
				<div class="preview-header">Preview</div>
				<div class="preview-grid">
					<div class="preview-item">
						<span class="preview-label">Absolute</span>
						<span class="preview-value mono">{previewAbsolute}</span>
					</div>
					<div class="preview-item">
						<span class="preview-label">Relative</span>
						<span class="preview-value mono">{previewRelative}</span>
					</div>
				</div>
			</div>
		</div>

		<footer class="modal-footer">
			<button type="button" class="btn-secondary" onclick={() => resetTimePreferences()} disabled={isDefaults}>
				Reset to defaults
			</button>
			<button type="button" class="btn-primary" onclick={onclose}>Done</button>
		</footer>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: hsl(0 0% 0% / 0.65);
		z-index: var(--z-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-8);
	}

	.modal {
		background: hsl(var(--bg-surface-100));
		border: var(--border-width) solid hsl(var(--border-overlay));
		border-radius: var(--radius-xl);
		padding: var(--space-6);
		max-width: 720px;
		width: 100%;
		max-height: 85vh;
		overflow-y: auto;
		z-index: var(--z-modal);
		box-shadow: var(--shadow-overlay);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.header-copy {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.modal-title {
		font-family: var(--font-family);
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		line-height: var(--leading-tight);
		color: hsl(var(--fg-default));
		margin: 0;
	}

	.modal-description {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-light));
		margin: 0;
	}

	.btn-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		color: hsl(var(--fg-light));
		background: transparent;
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: var(--transition-colors);
	}

	.btn-icon:hover {
		color: hsl(var(--fg-default));
		border-color: hsl(var(--border-strong));
	}

	.modal-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.field-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.field-full {
		grid-column: 1 / -1;
	}

	.label {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-medium);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
		color: hsl(var(--fg-light));
	}

	.input {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		color: hsl(var(--fg-default));
		background: hsl(var(--bg-control));
		border: var(--border-width) solid hsl(var(--border-control));
		border-radius: var(--radius-sm);
		padding: var(--space-1\.5) var(--space-2);
		min-height: 32px;
		transition: var(--transition-colors);
	}

	.input:focus {
		outline: none;
		border-color: hsl(var(--border-focus));
	}

	.field-hint {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		line-height: var(--leading-snug);
		color: hsl(var(--fg-lighter));
		margin: 0;
	}

	.field-hint code {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: hsl(var(--fg-data));
	}

	.toggle-row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: hsl(var(--bg-surface-75));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.toggle-row input {
		margin-top: var(--space-0\.5);
	}

	.toggle-copy {
		display: flex;
		flex-direction: column;
		gap: var(--space-0\.5);
	}

	.toggle-title {
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: hsl(var(--fg-default));
	}

	.toggle-description {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.preview {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		background: hsl(var(--bg-surface-75));
		border: var(--border-width) solid hsl(var(--border-default));
		border-radius: var(--radius-md);
	}

	.preview-header {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		letter-spacing: var(--tracking-wide);
		text-transform: uppercase;
		color: hsl(var(--fg-lighter));
	}

	.preview-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-3);
	}

	.preview-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.preview-label {
		font-family: var(--font-family);
		font-size: var(--text-xs);
		color: hsl(var(--fg-lighter));
	}

	.preview-value {
		font-size: var(--text-sm);
		color: hsl(var(--fg-data));
		word-break: break-word;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.btn-secondary,
	.btn-primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-1\.5) var(--space-3);
		font-family: var(--font-family);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		line-height: var(--leading-tight);
		border-radius: var(--radius-md);
		cursor: pointer;
		min-height: 32px;
		transition: var(--transition-colors);
	}

	.btn-secondary {
		color: hsl(var(--fg-light));
		background: hsl(var(--bg-surface-300));
		border: var(--border-width) solid hsl(var(--border-default));
	}

	.btn-secondary:hover:not(:disabled) {
		color: hsl(var(--fg-default));
		border-color: hsl(var(--border-strong));
		background: hsl(var(--bg-surface-400));
	}

	.btn-primary {
		color: hsl(var(--fg-contrast));
		background: hsl(var(--brand-default));
		border: var(--border-width) solid transparent;
	}

	.btn-primary:hover {
		background: hsl(var(--brand-600));
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
