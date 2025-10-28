<script lang="ts">
    import type { TimelineItem } from '$lib/stores/cacheStore';
    
    export let item: TimelineItem;
    export let childLeftMarginOffset = "0rem";

    let relations: TimelineItem[] = [];
    let showDetails = false;

    // Combined display field configuration for both events and actions
    const displayFieldsConfig = {
        event: [
            { key: "event_type", label: "", class: "event-time" },
            { key: "source", label: "Source: ", class: "event-source" },
            {
                key: "source_reliability",
                label: "Grade: ",
                class: "event-type",
            },
            { key: "severity", label: "Sev: ", class: "event-description" },
        ],
        action: [
            { key: "action_type", label: "", class: "action-type" },
            { key: "result", label: "Result: ", class: "action-result" },
            { key: "outcome", label: "Outcome: ", class: "action-outcome" },
            {
                key: "tool_used",
                label: "Tool Used: ",
                class: "action-toolUsed",
            },
            { key: "notes", label: "Notes: ", class: "action-notes" },
            { key: "tags", label: "Tags: ", class: "action-tags" },
        ],
    };

    // Function to format epoch timestamp to human-readable time
    function formatTimestamp(epochTime: number): string {
        if (!epochTime) return "N/A";

        const timestamp =
            epochTime.toString().length === 10 ? epochTime * 1000 : epochTime;
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return "Invalid Date";

        return date.toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });
    }

    function promptRelationModal() {
        //modalState.update((state) => ({ ...state, relation: true }));
    }

    function showChilds(uuid: string) {
        // TODO: Implement fetching related entities
        showDetails = !showDetails;
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="timeline-item {item.type}" style="margin-left: {childLeftMarginOffset};">
    <!-- Type Indicator Badge -->
    <div class="type-indicator {item.type}">
        <span class="type-icon">
            {item.type === 'event' ? '●' : '▸'}
        </span>
        <span class="type-label">{item.displayType}</span>
    </div>

    <!-- Timestamp -->
    <div class="timestamp" title="Occurred or Performed At">
        <span class="terminal-prompt">></span>
        <span class="time-value">{formatTimestamp(item.timestamp)}</span>
    </div>

    <!-- Data Fields Container -->
    <div class="data-fields">
        {#each displayFieldsConfig[item.type] as field}
            <span class="datafield">
                {#if field.label}
                    <span class="field-label">{field.label}</span>
                {/if}
                <span class="field-value">{(item.data as any)[field.key] || '—'}</span>
            </span>
        {/each}
    </div>

    <!-- Action Buttons -->
    <div class="actions">
        <button
            class="action-btn details"
            title="Show Related Entities"
            onclick={() => showChilds(item.uuid)}>
            <span class="btn-icon">🔍</span>
        </button>
        <button
            class="action-btn annotate"
            title="Add Annotation"
            onclick={() => promptRelationModal()}>
            <span class="btn-icon">📝</span>
        </button>
    </div>
</div>

<!-- Related Entities (Child Items) -->
{#if showDetails}
    <div class="related-entities">
        {#each relations as child}
            <!-- Recursive render: this component is TimelineMainRow itself -->
            <svelte:self item={child} childLeftMarginOffset={"1.5rem"} />
        {/each}
    </div>
{/if}

<style>
    .timeline-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        border-left: 2px solid var(--color-border-strong);
        background: var(--color-bg-secondary);
        border-radius: var(--border-radius-sm);
        margin-bottom: var(--spacing-xs);
        transition: all var(--transition-fast);
    }

    .timeline-item.event {
        border-left-color: var(--color-accent-primary);
    }

    .timeline-item.action {
        border-left-color: var(--color-accent-success);
    }

    .timeline-item:hover {
        background: var(--color-bg-hover);
        border-left-width: 3px;
    }

    /* Type Indicator */
    .type-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--border-radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        min-width: 80px;
        border: 1px solid var(--color-border-medium);
        background: var(--color-bg-tertiary);
    }

    .type-indicator.event {
        color: var(--color-accent-primary);
        border-color: var(--color-accent-primary);
    }

    .type-indicator.action {
        color: var(--color-accent-success);
        border-color: var(--color-accent-success);
    }

    .type-icon {
        font-size: var(--font-size-sm);
    }

    /* Timestamp */
    .timestamp {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-secondary);
        min-width: 160px;
        font-size: var(--font-size-xs);
    }

    .terminal-prompt {
        color: var(--color-accent-success);
        font-size: var(--font-size-sm);
    }

    .time-value {
        color: var(--color-text-primary);
    }

    /* Data Fields */
    .data-fields {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs);
        flex: 1;
        align-items: center;
    }

    .datafield {
        display: inline-flex;
        align-items: center;
        padding: var(--spacing-xs) var(--spacing-sm);
        background: var(--color-bg-tertiary);
        border-left: 2px solid var(--color-border-medium);
        border-radius: var(--border-radius-sm);
        font-size: var(--font-size-xs);
        max-width: 200px;
    }

    .field-label {
        color: var(--color-text-tertiary);
        margin-right: var(--spacing-xs);
    }

    .field-value {
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Actions */
    .actions {
        display: flex;
        gap: var(--spacing-xs);
        margin-left: auto;
        flex-shrink: 0;
    }

    .action-btn {
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border-medium);
        border-radius: var(--border-radius-sm);
        padding: var(--spacing-xs) var(--spacing-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
        font-size: var(--font-size-sm);
    }

    .action-btn:hover {
        background: var(--color-bg-hover);
        border-color: var(--color-accent-primary);
        transform: scale(1.05);
    }

    .action-btn.details:hover {
        border-color: var(--color-accent-secondary);
    }

    .btn-icon {
        display: block;
    }

    /* Related Entities */
    .related-entities {
        margin-top: var(--spacing-sm);
        padding-left: var(--spacing-lg);
        border-left: 2px dashed var(--color-border-subtle);
    }
</style>
