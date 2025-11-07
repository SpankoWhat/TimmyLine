<script lang="ts">
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import { getUsersOnRow, emitRowViewing, emitRowIdle } from '$lib/stores/presenceStore';
    import TimelineRow from './TimelineRow.svelte';
    
    let { 
        item, 
        childLeftMarginOffset = "0rem", 
        index = 0 
    }: { 
        item: TimelineItem; 
        childLeftMarginOffset?: string; 
        index?: number;
    } = $props();

    let relations = $state<TimelineItem[]>([]);
    let showDetails = $state(false);
    let showExpandedDetails = $state(false);
    let isVisible = $state(false);
    let isHovered = $state(false);

    // Get users currently viewing/editing this row
    let usersHere = $derived($getUsersOnRow(item.uuid));

    $effect(() => {
        // Small delay to trigger animation after mount
        const timeout = setTimeout(() => {
            isVisible = true;
        }, 10);
        
        return () => clearTimeout(timeout);
    });

    // Emit presence when hovering
    function handleMouseEnter() {
        isHovered = true;
        emitRowViewing(item.uuid);
    }

    function handleMouseLeave() {
        isHovered = false;
        emitRowIdle();
    }

    // Combined display field configuration for both events and actions
    // Fields marked as 'tag: true' will be displayed as tags, others as free-form text
    const displayFieldsConfig = {
        event: [
            { key: "event_type", label: "", class: "event-time", tag: true },
            { key: "source", label: "Source", class: "event-source", tag: true },
            {
                key: "source_reliability",
                label: "Grade",
                class: "event-type",
                tag: true,
            },
            { key: "severity", label: "Sev", class: "event-description", tag: true },
        ],
        action: [
            { key: "action_type", label: "", class: "action-type", tag: true },
            { key: "result", label: "Result", class: "action-result", tag: true },
            { key: "outcome", label: "Outcome", class: "action-outcome", tag: true },
            {
                key: "tool_used",
                label: "Tool",
                class: "action-toolUsed",
                tag: true,
            },
            { key: "notes", label: "Notes", class: "action-notes", tag: false },
            { key: "tags", label: "Tags", class: "action-tags", tag: false },
        ],
    };

    // Fields to show in expanded details view
    const detailFieldsConfig = {
        event: ["description", "notes", "tags"],
        action: ["notes", "tags", "analyst_notes"],
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

    function toggleExpandedDetails() {
        showExpandedDetails = !showExpandedDetails;
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div 
    class="timeline-item {item.type}" 
    class:visible={isVisible}
    class:has-presence={usersHere.length > 0}
    style="margin-left: {childLeftMarginOffset}; animation-delay: {index * 50}ms;" 
    onclick={toggleExpandedDetails}
    onmouseenter={handleMouseEnter}
    onmouseleave={handleMouseLeave}
>
    <!-- Presence Indicators -->
    {#if usersHere.length > 0}
        <div class="presence-indicators">
            {#each usersHere as user}
                <div 
                    class="user-avatar"
                    class:editing={user.action === 'editing'}
                    style:border-color={user.color}
                    style:background-color={user.color}
                    title={`${user.analystName} is ${user.action}`}
                >
                    <span class="avatar-initial">{user.analystName.charAt(0).toUpperCase()}</span>
                    {#if user.action === 'editing'}
                        <span class="editing-badge">✏️</span>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    <!-- Type Indicator Badge -->
    <div class="type-indicator {item.type}">
        <span class="type-icon">
            {item.type === 'event' ? '🔸' : '🔹'}
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
            {#if field.tag}
                <!-- Display as tag -->
                <span class="datafield tag">
                    {#if field.label}
                        <span class="field-label">{field.label}</span>
                    {/if}
                    <span class="field-value">{(item.data as any)[field.key] || '—'}</span>
                </span>
            <!-- {:else}
                {#if (item.data as any)[field.key]}
                    <span class="datafield inline">
                        <span class="field-label">{field.label}:</span>
                        <span class="field-value-inline">{((item.data as any)[field.key] || '').substring(0, 50)}{((item.data as any)[field.key] || '').length > 50 ? '...' : ''}</span>
                    </span>
                {/if}-->
            {/if} 
        {/each}
    </div>

    <!-- Action Buttons -->
    <div class="actions" onclick={(e) => e.stopPropagation()}>
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

<!-- Expanded Details View -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
{#if showExpandedDetails}
    <div class="expanded-details" onclick={(e) => e.stopPropagation()}>
        <div class="details-content">
            <h4 class="details-title">Full Details</h4>
            <div class="details-grid">
                {#each Object.entries(item.data) as [key, value]}
                    {#if value}
                        <div class="detail-item">
                            <span class="detail-label">{key.replace(/_/g, ' ')}:</span>
                            <span class="detail-value">{value}</span>
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
    </div>
{/if}

<!-- Related Entities (Child Items) -->
{#if showDetails}
    <div class="related-entities">
        {#each relations as child, childIndex}
            <!-- Recursive render using self-import -->
            <TimelineRow item={child} childLeftMarginOffset={"1.5rem"} index={childIndex} />
        {/each}
    </div>
{/if}

<style>
    .timeline-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: var(--spacing-sm);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-left: 2px solid var(--color-border-strong);
        background: var(--color-bg-secondary);
        border-radius: var(--border-radius-sm);
        margin-bottom: var(--spacing-xs);
        transition: all var(--transition-fast);
        cursor: pointer;
        opacity: 0;
        transform: translateX(-20px);
        animation: fadeInSlide 0.3s ease-out forwards;
    }

    @keyframes fadeInSlide {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .timeline-item.visible {
        opacity: 1;
        transform: translateX(0);
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
        padding: 2px var(--spacing-xs);
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

    /* Tag-style fields */
    .datafield.tag {
        display: inline-flex;
        align-items: center;
        padding: 2px var(--spacing-xs);
        background: var(--color-bg-tertiary);
        border-left: 2px solid var(--color-border-medium);
        border-radius: var(--border-radius-sm);
        font-size: var(--font-size-xs);
        max-width: 200px;
    }

    .datafield.tag .field-label {
        color: var(--color-text-tertiary);
        margin-right: var(--spacing-xs);
        font-size: 10px;
    }

    .datafield.tag .field-value {
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Inline text fields */
    .datafield.inline {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
    }

    .datafield.inline .field-label {
        color: var(--color-text-tertiary);
        font-weight: var(--font-weight-medium);
    }

    .field-value-inline {
        color: var(--color-text-secondary);
        font-style: italic;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
        padding: 2px var(--spacing-xs);
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

    /* Expanded Details View */
    .expanded-details {
        margin-top: var(--spacing-xs);
        margin-bottom: var(--spacing-sm);
        padding: var(--spacing-sm) var(--spacing-md);
        background: var(--color-bg-tertiary);
        border-left: 3px solid var(--color-accent-secondary);
        border-radius: var(--border-radius-sm);
        animation: slideDown 0.2s ease-out;
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .details-content {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
    }

    .details-title {
        margin: 0;
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-accent-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 1px solid var(--color-border-subtle);
        padding-bottom: var(--spacing-xs);
    }

    .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: var(--spacing-sm);
    }

    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: var(--spacing-xs);
        background: var(--color-bg-secondary);
        border-radius: var(--border-radius-sm);
    }

    .detail-label {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-tertiary);
        text-transform: capitalize;
    }

    .detail-value {
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
        word-wrap: break-word;
        white-space: pre-wrap;
    }

    /* Related Entities */
    .related-entities {
        margin-top: var(--spacing-sm);
        padding-left: var(--spacing-lg);
        border-left: 2px dashed var(--color-border-subtle);
    }

    /* Presence Indicators */
    .presence-indicators {
        position: absolute;
        top: -8px;
        right: 8px;
        display: flex;
        gap: 4px;
        z-index: 10;
    }

    .user-avatar {
        position: relative;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: var(--font-weight-bold);
        color: var(--color-text-inverted);
        background-clip: padding-box;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease;
        cursor: help;
    }

    .user-avatar:hover {
        transform: scale(1.15);
    }

    .user-avatar.editing {
        animation: pulse 2s infinite;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
    }

    @keyframes pulse {
        0%, 100% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.1);
        }
    }

    .avatar-initial {
        display: block;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .editing-badge {
        position: absolute;
        bottom: -4px;
        right: -4px;
        width: 16px;
        height: 16px;
        background: var(--color-bg-primary);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        border: 1px solid var(--color-border-medium);
    }

    .timeline-item.has-presence {
        border-left-width: 3px;
    }
</style>

