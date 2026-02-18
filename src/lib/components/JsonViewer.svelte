<script lang="ts">
    let {
        data,
        visibleLines = 5,
        lineHeight = 16
    }: {
        data: string;
        visibleLines?: number;
        lineHeight?: number;
    } = $props();

    type JsonToken = { type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation'; text: string };

    /** Safely parse a JSON string, returning null on failure */
    function tryParseJson(value: string): object | null {
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null ? parsed : null;
        } catch {
            return null;
        }
    }

    /**
     * Tokenize a pretty-printed JSON line into typed tokens for syntax highlighting.
     */
    function tokenizeJsonLine(line: string): JsonToken[] {
        const tokens: JsonToken[] = [];
        let i = 0;
        while (i < line.length) {
            const ch = line[i];

            // Whitespace
            if (ch === ' ' || ch === '\t') {
                let ws = '';
                while (i < line.length && (line[i] === ' ' || line[i] === '\t')) {
                    ws += line[i];
                    i++;
                }
                tokens.push({ type: 'punctuation', text: ws });
                continue;
            }

            // Structural characters
            if ('{}[],:'.includes(ch)) {
                tokens.push({ type: 'punctuation', text: ch });
                i++;
                continue;
            }

            // Strings (keys or values)
            if (ch === '"') {
                let str = '"';
                i++;
                while (i < line.length && line[i] !== '"') {
                    if (line[i] === '\\') {
                        str += line[i] + (line[i + 1] ?? '');
                        i += 2;
                    } else {
                        str += line[i];
                        i++;
                    }
                }
                str += '"';
                i++;

                // Determine if this is a key (followed by `:`)
                let lookahead = i;
                while (lookahead < line.length && (line[lookahead] === ' ' || line[lookahead] === '\t')) lookahead++;
                const isKey = lookahead < line.length && line[lookahead] === ':';

                tokens.push({ type: isKey ? 'key' : 'string', text: str });
                continue;
            }

            // Numbers
            if (ch === '-' || (ch >= '0' && ch <= '9')) {
                let num = '';
                while (i < line.length && /[\d.eE+\-]/.test(line[i])) {
                    num += line[i];
                    i++;
                }
                tokens.push({ type: 'number', text: num });
                continue;
            }

            // Booleans and null
            if (line.startsWith('true', i)) { tokens.push({ type: 'boolean', text: 'true' }); i += 4; continue; }
            if (line.startsWith('false', i)) { tokens.push({ type: 'boolean', text: 'false' }); i += 5; continue; }
            if (line.startsWith('null', i)) { tokens.push({ type: 'null', text: 'null' }); i += 4; continue; }

            // Fallback
            tokens.push({ type: 'punctuation', text: ch });
            i++;
        }
        return tokens;
    }

    let parsed = $derived(tryParseJson(data));
    let jsonLines = $derived(parsed ? JSON.stringify(parsed, null, 2).split('\n') : []);
</script>

{#if parsed}
    <div
        class="json-viewer-container"
        style="max-height: {visibleLines * lineHeight}px;"
    >
        <div class="json-content">
            {#each jsonLines as line, idx (idx)}
                <div class="json-line">
                    {#each tokenizeJsonLine(line) as token, tidx (tidx)}
                        <span class="json-token json-{token.type}">{token.text}</span>
                    {/each}
                </div>
            {/each}
        </div>
    </div>
{:else}
    <span class="json-raw">{data}</span>
{/if}

<style>
    .json-viewer-container {
        display: flex;
        overflow-y: auto;
        overflow-x: hidden;
        font-family: var(--font-mono);
        font-size: var(--text-xs);
    }

    .json-viewer-container::-webkit-scrollbar {
        width: var(--space-1);
    }

    .json-viewer-container::-webkit-scrollbar-track {
        background: hsl(var(--bg-surface-100));
    }

    .json-viewer-container::-webkit-scrollbar-thumb {
        background: hsl(var(--border-default));
        border-radius: var(--radius-xs);
    }

    .json-pipe-column {
        flex-shrink: 0;
        user-select: none;
        padding-top: var(--space-1);
        padding-bottom: var(--space-1);
    }

    .json-pipe-line {
        line-height: 16px;
        height: 16px;
        color: hsl(var(--brand-default));
        white-space: pre;
    }

    .json-content {
        flex: 1;
        min-width: 0;
        overflow-x: auto;
        background: hsl(var(--bg-alternative));
        border-left: var(--border-width-thick) solid hsl(var(--border-default));
        padding: var(--space-1) var(--space-1);
        border-radius: var(--radius-sm);
    }

    .json-content::-webkit-scrollbar {
        height: var(--space-1);
    }

    .json-content::-webkit-scrollbar-track {
        background: hsl(var(--bg-surface-100));
    }

    .json-content::-webkit-scrollbar-thumb {
        background: hsl(var(--border-default));
        border-radius: var(--radius-xs);
    }

    .json-line {
        line-height: 16px;
        height: 16px;
        white-space: pre;
    }

    /* Syntax Colors */
    .json-token {
        white-space: pre;
    }

    .json-key {
        color: hsl(var(--brand-default));
        font-weight: var(--font-bold);
    }

    .json-string {
        color: hsl(var(--success-default));
    }

    .json-number {
        color: hsl(var(--info-default));
    }

    .json-boolean {
        color: hsl(var(--warning-default));
        font-weight: var(--font-bold);
    }

    .json-null {
        color: hsl(var(--fg-muted));
        font-style: italic;
    }

    .json-punctuation {
        color: hsl(var(--fg-lighter));
    }

    .json-raw {
        color: hsl(var(--fg-default));
    }
</style>
