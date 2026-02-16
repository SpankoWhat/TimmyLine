<script lang="ts">
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import { currentSelectedIncident, highlightedItemUuids } from '$lib/stores/cacheStore';
    import { emitViewRow, emitIdle, getUsersOnRow } from '$lib/stores/collabStore';
    import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
    import type { EntityType, DisplayFieldsConfig } from '$lib/modals/types';
    import { fade } from 'svelte/transition';
    import { getFieldValue } from '$lib/utils/dynamicFields';
    import TimelineRowDetails from './TimelineRowDetails.svelte';
    
    let { 
        item,
        displayFieldsConfig
    }: { 
        item: TimelineItem,
        displayFieldsConfig: DisplayFieldsConfig;
    } = $props();

    let showExpandedDetails = $state(false);
    let columnRatio = $state(0.30); // Default ratio for graph-column (30%)
    
    // Reactive derived value - updates when incidentUsers changes
    let usersOnThisRow = $derived($getUsersOnRow(item.uuid));
    
    // Check if any user is currently editing this row
    let isBeingEditedByOther = $derived(
        usersOnThisRow.some((user) => user.editingRow === item.uuid)
    );

    // Check if this row is highlighted (from entity/annotation panel)
    let isHighlighted = $derived($highlightedItemUuids.has(item.uuid));

    // Helper to get field value with support for dynamic JSON fields
    function getDisplayValue(field: { key: string; isDynamic?: boolean; parentKey?: string; allowDynamicFieldRendering?: boolean }): string {
        return getFieldValue(item.data as Record<string, unknown>, field);
    }

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

    function toggleExpandedDetails() {
        if (showExpandedDetails) {
            showExpandedDetails = false;
            emitIdle();
            return;
        }
        showExpandedDetails = true;
        emitViewRow(item.uuid);
    }

    // Function to generate a consistent color from a string (e.g., username)
    function randomColorFromString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    async function deleteEntity(uuid: string) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return;
        }

        // Determine the endpoint based on item type
        const endpoint = item.type === 'event' 
            ? '/api/delete/core/timeline_events'
            : item.type === 'action'
            ? '/api/delete/core/investigation_actions'
            : '/api/delete/core/annotations';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    uuid,
                    incident_id: $currentSelectedIncident?.uuid
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to delete: ${error}`);
            }

            console.log(`Successfully deleted ${item.type} with uuid: ${uuid}`);
        } catch (error) {
            console.error('Error deleting entity:', error);
            alert(`Failed to delete ${item.type}: ${(error as Error).message}`);
        }
    }
    
    function editEntity() {
        // Determine the entity type based on item type
        const entityType: EntityType = item.type === 'event' 
            ? 'timeline_event' 
            : 'investigation_action';
        
        // Open modal in edit mode with the item's data
        // The modal will emit editing state via GenericModal's $effect
        modalStore.open(createModalConfig(entityType, 'edit', item.data));
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div 
    class="timeline-item" 
    class:highlighted={isHighlighted}
    data-timeline-uuid={item.uuid}
    onclick={toggleExpandedDetails}
>

    <div class="main-row">
        <!-- Data Row Fields -->
        <div class="data-row">
            <!-- Timestamp -->
            <div class="timestamp data-section" title="Occurred or Performed At">
                <span class="field-prefix">│</span>
                <span class="timestamp title">TIME</span>
                <span class="timestamp value">{formatTimestamp(item.timestamp)}</span>
            </div>
            <!-- Pinned Entity Fields (sorted by order) -->
            {#each [...displayFieldsConfig[item.type]].filter(f => f.pinned && !f.showInNote).sort((a, b) => a.order - b.order) as field (field.key)}
                {@const fieldValue = getDisplayValue(field)}
                {#if fieldValue && fieldValue !== '—'}
                    <div 
                        class="datafield data-section" 
                        class:dynamic-field={field.isDynamic}
                        style="--stagger-delay: {Math.random() * 300}ms;"
                        transition:fade={{ duration: 180 }}
                    >
                        <span class="field-prefix">{field.isDynamic ? '◈' : '│'}</span>
                        <span class="datafield title">{field.label?.toUpperCase() || '-'}</span>
                        <span class="datafield value">{fieldValue}</span>
                    </div>
                {/if}
            {/each}
        </div>
    </div>

    <div class="secondary-row">
        <div class="note-snippet">
            {#each displayFieldsConfig[item.type] as field, idx (field.key)}
                {#if field.showInNote}
                    <div 
                        class="datafield note-section" 
                        class:dynamic-field={field.isDynamic}
                        style="--stagger-delay: {Math.random() * 300}ms;"
                        transition:fade={{ duration: 180 }}
                    >
                        <span class="field-prefix">{field.isDynamic ? '  ◈─' : '  └─'}</span>
                        <span class="datafield value">{getDisplayValue(field)}</span>
                    </div>
                {/if}
            {/each}
        </div>
        
        <!-- Presence Indicators -->
        {#if usersOnThisRow.length > 0}
            <div class="presence-indicators">
                {#each usersOnThisRow as user}
                    <div 
                        class="user-avatar"
                        style:background-color={randomColorFromString(user.analystName)}
                        title={`${user.analystName} is ${user.editingRow === item.uuid ? 'editing' : 'viewing'} this item`}
                                >
                    </div>
                {/each}
            </div>
        {/if}
        
        <div class="actions" onclick={(e) => e.stopPropagation()}>
            <button
                class="action-btn"
                class:disabled={isBeingEditedByOther}
                disabled={isBeingEditedByOther}
                title={isBeingEditedByOther ? 'Another user is editing this item' : 'Edit'}
                onclick={editEntity}>
                <span class="btn-icon">✎</span>
            </button>
            <button
                class="action-btn"
                title="Delete"
                onclick={() => deleteEntity(item.uuid)}>
                <span class="btn-icon">✕</span>
            </button>
        </div>
    </div>
</div>

<!-- Expanded Details View -->
{#if showExpandedDetails}
    <TimelineRowDetails
        {item}
        type={item.type}
        bind:columnRatio
        onEdit={editEntity}
        onDelete={deleteEntity}
    />
{/if}

<style>
    .timeline-item {
        display: flex;
        flex-direction: column;
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border-medium);
        border-radius: 2px;
        margin-bottom: 2px;
        font-family: 'Courier New', monospace;
        transition: all 0.15s ease;
        font-size: var(--font-size-xs);
        line-height: 1.2;
    }

    .timeline-item:hover {
        background: var(--color-bg-hover);
        border-color: var(--color-accent-primary);
        box-shadow: 0 0 4px rgba(0, 255, 0, 0.1);
    }

    /* Highlighted state from entities/annotations panel */
    .timeline-item.highlighted {
        border-color: var(--color-accent-warning);
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
        animation: highlightPulse 2s ease-in-out infinite;
    }

    @keyframes highlightPulse {
        0%, 100% {
            box-shadow: 0 0 5px rgba(251, 191, 36, 0.3);
            border-color: var(--color-accent-warning);
        }
        50% {
            box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
            border-color: var(--color-accent-warning);
        }
    }

    .main-row {
        display: flex;
        flex-direction: row;
        width: 100%;
        justify-content: space-between;
        padding: 2px 4px;
    }

    .secondary-row {
        display: flex;
        flex-direction: row;
        width: 100%;
        justify-content: space-between;
        align-items: center;
        padding: 0 4px 2px 4px;
    }

    .data-row {
        display: flex;
        flex-direction: row;
        gap: 8px;
        flex-wrap: nowrap;
        flex: 1;
        overflow: hidden;
    }

    .data-section {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: 4px;
        min-width: fit-content;
        white-space: nowrap;
        animation: slideInFade 0.4s ease-out forwards;
        animation-delay: var(--stagger-delay, 0ms);
        opacity: 0;
    }

    @keyframes slideInFade {
        from {
            opacity: 0;
            transform: translateX(-8px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .field-prefix {
        color: var(--color-border-medium);
        font-weight: bold;
        user-select: none;
    }

    .data-section .title {
        font-size: 10px;
        color: var(--color-accent-primary);
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .data-section .value {
        font-size: 11px;
        font-weight: bold;
        color: var(--color-text-primary);
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Dynamic field styling */
    .dynamic-field .field-prefix {
        color: var(--color-accent-warning);
        font-size: 8px;
    }

    .dynamic-field .title {
        color: var(--color-accent-warning);
    }

    .dynamic-field .value {
        color: var(--color-text-secondary);
    }

    .actions {
        display: flex;
        gap: 2px;
        align-items: center;
    }

    .action-btn {
        background: transparent;
        border: 1px solid var(--color-border-medium);
        color: var(--color-text-secondary);
        padding: 0 4px;
        cursor: pointer;
        font-size: 10px;
        border-radius: 2px;
        transition: all 0.15s ease;
        line-height: 1;
        height: 14px;
    }

    .action-btn:hover {
        border-color: var(--color-accent-warning);
        color: var(--color-accent-warning);
        background: rgba(255, 0, 0, 0.1);
    }

    .action-btn.disabled,
    .action-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        border-color: var(--color-border-medium);
        color: var(--color-text-tertiary);
    }

    .action-btn.disabled:hover,
    .action-btn:disabled:hover {
        border-color: var(--color-border-medium);
        color: var(--color-text-tertiary);
        background: transparent;
    }

    .btn-icon {
        font-size: 10px;
    }

    .note-snippet {
        font-style: italic;
        font-size: 10px;
        color: var(--color-text-secondary);
        flex: 1;
        line-height: 1.2;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .note-section {
        display: flex;
        gap: 2px;
        animation: slideInFade 0.4s ease-out forwards;
        animation-delay: var(--stagger-delay, 0ms);
        opacity: 0;
    }



    /* Presence indicators positioning */
    .presence-indicators {
        display: flex;
        gap: 4px;
        padding-right: var(--spacing-xs);
        padding-left: calc(var(--spacing-xs) * 2);
    }

    .user-avatar {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        color: white;
    }

</style>

