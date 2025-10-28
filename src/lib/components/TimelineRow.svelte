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
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-left: 3px solid;
        background: rgba(15, 23, 42, 0.5);
        border-radius: 0.25rem;
        margin-bottom: 0.5rem;
        font-family: 'Courier New', monospace;
        transition: all 0.2s ease;
    }

    .timeline-item.event {
        border-left-color: #3b82f6;
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(15, 23, 42, 0.5) 10%);
    }

    .timeline-item.action {
        border-left-color: #10b981;
        background: linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.5) 10%);
    }

    .timeline-item:hover {
        background: rgba(30, 41, 59, 0.7);
        border-left-width: 4px;
        box-shadow: 0 0 20px rgba(52, 211, 153, 0.15);
    }

    .timeline-item.event:hover {
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
    }

    /* Type Indicator */
    .type-indicator {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.25rem 0.75rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        min-width: 90px;
        border: 1px solid;
    }

    .type-indicator.event {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        border-color: rgba(59, 130, 246, 0.3);
    }

    .type-indicator.action {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border-color: rgba(16, 185, 129, 0.3);
    }

    .type-icon {
        font-size: 0.875rem;
        animation: pulse 2s infinite;
    }

    /* Timestamp */
    .timestamp {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: bold;
        color: #fbbf24;
        min-width: 180px;
        font-size: 0.8rem;
    }

    .terminal-prompt {
        color: #34d399;
        font-size: 1rem;
    }

    .time-value {
        color: #fbbf24;
    }

    /* Data Fields */
    .data-fields {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        flex: 1;
        align-items: center;
    }

    .datafield {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.5rem;
        background: rgba(71, 85, 105, 0.3);
        border-left: 2px solid rgba(148, 163, 184, 0.5);
        border-radius: 0.15rem;
        font-size: 0.75rem;
        max-width: 250px;
    }

    .field-label {
        color: #94a3b8;
        margin-right: 0.25rem;
    }

    .field-value {
        color: #e2e8f0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Actions */
    .actions {
        display: flex;
        gap: 0.5rem;
        margin-left: auto;
        flex-shrink: 0;
    }

    .action-btn {
        background: rgba(71, 85, 105, 0.4);
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 0.25rem;
        padding: 0.4rem 0.6rem;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 1rem;
    }

    .action-btn:hover {
        background: rgba(71, 85, 105, 0.7);
        border-color: #34d399;
        box-shadow: 0 0 10px rgba(52, 211, 153, 0.3);
        transform: scale(1.05);
    }

    .action-btn.details:hover {
        border-color: #60a5fa;
        box-shadow: 0 0 10px rgba(96, 165, 250, 0.3);
    }

    .btn-icon {
        display: block;
    }

    /* Related Entities */
    .related-entities {
        margin-top: 0.5rem;
        padding-left: 1rem;
        border-left: 2px dashed rgba(148, 163, 184, 0.3);
    }

    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
</style>
