<script lang="ts">
	interface Props {
		value: string;
		knownKeys?: string[];
		placeholder?: string;
		onchange: (newValue: string) => void;
	}

	let {
		value,
		knownKeys = [],
		placeholder = '{"key": "value"}',
		onchange
	}: Props = $props();

	type Row = { key: string; value: string };

	let mode: 'builder' | 'raw' = $state('builder');
	let rows: Row[] = $state([{ key: '', value: '' }]);
	let rawText: string = $state('');
	let parseError: string | null = $state(null);
	let activeKeyInput: number | null = $state(null);
	let lastSyncedValue: string = $state('');

	let keySuggestions: string[] = $derived.by(() => {
		if (activeKeyInput === null) return [];
		const currentKey = rows[activeKeyInput]?.key ?? '';
		const usedKeys = rows.map((r) => r.key).filter((k) => k !== currentKey);
		return knownKeys
			.filter((k) => !usedKeys.includes(k))
			.filter((k) => k.toLowerCase().includes(currentKey.toLowerCase()));
	});

	function parseValue(val: string): unknown {
		if (val === 'true') return true;
		if (val === 'false') return false;
		if (val === 'null') return null;
		const num = Number(val);
		if (val !== '' && !isNaN(num)) return num;
		return val;
	}

	function serializeRows(r: Row[]): string {
		const filtered = r.filter((row) => row.key !== '' || row.value !== '');
		if (filtered.length === 0) return '';
		const obj: Record<string, unknown> = {};
		for (const row of filtered) {
			if (row.key) {
				obj[row.key] = parseValue(row.value);
			}
		}
		return JSON.stringify(obj, null, 2);
	}

	function parseJsonToRows(text: string): Row[] | null {
		try {
			const parsed = JSON.parse(text);
			if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
			const entries = Object.entries(parsed);
			if (entries.length === 0) return [{ key: '', value: '' }];
			return entries.map(([k, v]) => ({ key: k, value: String(v) }));
		} catch {
			return null;
		}
	}

	// Sync from parent prop — intentionally imperative since rows/rawText are also user-mutated
	$effect(() => {
		const incoming = value;
		if (incoming === lastSyncedValue) return;
		lastSyncedValue = incoming;

		if (!incoming || incoming.trim() === '') {
			rows = [{ key: '', value: '' }];
			rawText = '';
			parseError = null;
			return;
		}
		const parsed = parseJsonToRows(incoming);
		if (parsed) {
			rows = parsed;
			rawText = incoming;
			parseError = null;
		} else {
			rows = [{ key: '', value: '' }];
			rawText = incoming;
		}
	});

	function emitChange(serialized: string) {
		lastSyncedValue = serialized;
		onchange(serialized);
	}

	function handleRowChange() {
		const serialized = serializeRows(rows);
		rawText = serialized;
		parseError = null;
		emitChange(serialized);
	}

	function updateKey(index: number, newKey: string) {
		rows[index].key = newKey;
		handleRowChange();
	}

	function updateValue(index: number, newValue: string) {
		rows[index].value = newValue;
		handleRowChange();
	}

	function addRow() {
		rows.push({ key: '', value: '' });
	}

	function removeRow(index: number) {
		if (rows.length <= 1) return;
		rows.splice(index, 1);
		handleRowChange();
	}

	function selectSuggestion(index: number, key: string) {
		rows[index].key = key;
		activeKeyInput = null;
		handleRowChange();
	}

	function handleRawInput(e: Event) {
		const target = e.target as HTMLTextAreaElement;
		rawText = target.value;
		if (rawText.trim() === '') {
			parseError = null;
			emitChange('');
			return;
		}
		try {
			JSON.parse(rawText);
			parseError = null;
			emitChange(rawText);
		} catch (err) {
			parseError = err instanceof Error ? err.message : 'Invalid JSON';
		}
	}

	function switchToBuilder() {
		if (mode === 'builder') return;
		if (!rawText || rawText.trim() === '') {
			rows = [{ key: '', value: '' }];
			parseError = null;
			mode = 'builder';
			return;
		}
		const parsed = parseJsonToRows(rawText);
		if (parsed) {
			rows = parsed;
			parseError = null;
			mode = 'builder';
		} else {
			parseError = 'Cannot switch: JSON is invalid';
		}
	}

	function switchToRaw() {
		if (mode === 'raw') return;
		rawText = serializeRows(rows);
		parseError = null;
		mode = 'raw';
	}

	function isNewKey(key: string): boolean {
		return key !== '' && !knownKeys.includes(key);
	}

	function handleKeyFocus(index: number) {
		activeKeyInput = index;
	}

	function handleKeyBlur() {
		setTimeout(() => {
			activeKeyInput = null;
		}, 150);
	}
</script>

<div class="json-editor">
	<div class="mode-toggle">
		<button
			class="mode-btn"
			class:active={mode === 'builder'}
			onclick={switchToBuilder}
			type="button"
		>
			⌸ Builder
		</button>
		<button
			class="mode-btn"
			class:active={mode === 'raw'}
			onclick={switchToRaw}
			type="button"
		>
			{"{ }"} Raw
		</button>
	</div>

	{#if parseError}
		<div class="parse-error">{parseError}</div>
	{/if}

	{#if mode === 'builder'}
		<div class="builder">
			{#each rows as row, i (i)}
				<div class="kv-row">
					<div class="key-wrapper">
						<input
							type="text"
							class="kv-input key-input"
							placeholder="key"
							value={row.key}
							oninput={(e) => updateKey(i, (e.target as HTMLInputElement).value)}
							onfocus={() => handleKeyFocus(i)}
							onblur={handleKeyBlur}
						/>
						{#if isNewKey(row.key)}
							<span class="new-indicator">(new)</span>
						{/if}
						{#if activeKeyInput === i && keySuggestions.length > 0}
							<ul class="suggestions">
								{#each keySuggestions as suggestion (suggestion)}
									<li>
										<button
											type="button"
											class="suggestion-btn"
											onmousedown={() => selectSuggestion(i, suggestion)}
										>
											{suggestion}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<span class="kv-separator">:</span>

					<input
						type="text"
						class="kv-input value-input"
						placeholder="value"
						value={row.value}
						oninput={(e) => updateValue(i, (e.target as HTMLInputElement).value)}
					/>

					<button
						type="button"
						class="remove-btn"
						onclick={() => removeRow(i)}
						disabled={rows.length <= 1}
						title="Remove field"
					>
						✕
					</button>
				</div>
			{/each}

			<button type="button" class="add-btn" onclick={addRow}>
				+ Add Field
			</button>
		</div>
	{:else}
		<textarea
			class="raw-textarea"
			{placeholder}
			value={rawText}
			oninput={handleRawInput}
			spellcheck="false"
		></textarea>
	{/if}
</div>

<style>
	.json-editor {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
	}

	.mode-toggle {
		display: flex;
		gap: 2px;
		background: var(--color-bg-tertiary);
		border-radius: var(--border-radius-sm);
		padding: 2px;
		width: fit-content;
	}

	.mode-btn {
		padding: 2px var(--spacing-sm);
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		cursor: pointer;
		border-radius: var(--border-radius-sm);
		transition: var(--transition-fast);
	}

	.mode-btn:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-hover);
	}

	.mode-btn.active {
		background: var(--color-bg-secondary);
		color: var(--color-accent-primary);
	}

	.parse-error {
		color: var(--color-accent-error);
		font-size: var(--font-size-xs);
		padding: var(--spacing-xs) var(--spacing-sm);
		background: color-mix(in srgb, var(--color-accent-error) 10%, transparent);
		border-radius: var(--border-radius-sm);
		border: 1px solid color-mix(in srgb, var(--color-accent-error) 30%, transparent);
	}

	.builder {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.kv-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.key-wrapper {
		position: relative;
		flex: 1;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.kv-input {
		width: 100%;
		padding: 4px var(--spacing-xs);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--border-radius-sm);
		color: var(--color-text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		transition: var(--transition-fast);
	}

	.kv-input:focus {
		outline: none;
		border-color: var(--color-accent-primary);
	}

	.kv-input::placeholder {
		color: var(--color-text-dim);
	}

	.key-input {
		flex: 1;
	}

	.value-input {
		flex: 1.5;
	}

	.kv-separator {
		color: var(--color-text-tertiary);
		font-weight: bold;
		flex-shrink: 0;
	}

	.new-indicator {
		color: var(--color-accent-warning);
		font-size: var(--font-size-xs);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin: 0;
		padding: 0;
		list-style: none;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-medium);
		border-radius: var(--border-radius-sm);
		max-height: 120px;
		overflow-y: auto;
		z-index: 10;
	}

	.suggestion-btn {
		display: block;
		width: 100%;
		padding: 4px var(--spacing-xs);
		background: transparent;
		border: none;
		color: var(--color-text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		text-align: left;
		cursor: pointer;
		transition: var(--transition-fast);
	}

	.suggestion-btn:hover {
		background: var(--color-bg-hover);
		color: var(--color-accent-primary);
	}

	.remove-btn {
		padding: 2px 6px;
		background: transparent;
		border: 1px solid transparent;
		color: var(--color-text-dim);
		font-size: var(--font-size-xs);
		cursor: pointer;
		border-radius: var(--border-radius-sm);
		transition: var(--transition-fast);
		flex-shrink: 0;
	}

	.remove-btn:hover:not(:disabled) {
		color: var(--color-accent-error);
		border-color: color-mix(in srgb, var(--color-accent-error) 30%, transparent);
	}

	.remove-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.add-btn {
		padding: 4px var(--spacing-sm);
		background: transparent;
		border: 1px dashed var(--color-border-subtle);
		color: var(--color-text-tertiary);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		cursor: pointer;
		border-radius: var(--border-radius-sm);
		transition: var(--transition-fast);
	}

	.add-btn:hover {
		border-color: var(--color-accent-primary);
		color: var(--color-accent-primary);
		background: color-mix(in srgb, var(--color-accent-primary) 5%, transparent);
	}

	.raw-textarea {
		width: 100%;
		min-height: 120px;
		padding: var(--spacing-sm);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--border-radius-sm);
		color: var(--color-text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		resize: vertical;
		transition: var(--transition-fast);
	}

	.raw-textarea:focus {
		outline: none;
		border-color: var(--color-accent-primary);
	}

	.raw-textarea::placeholder {
		color: var(--color-text-dim);
	}
</style>
