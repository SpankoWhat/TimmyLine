<script lang="ts">
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import { currentSelectedIncident } from '$lib/stores/cacheStore';
    import { emitViewRow, emitIdle, getUsersOnRow } from '$lib/stores/collabStore';
    import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
    import type { EntityType } from '$lib/modals/types';
    import TimelineRow from './TimelineRow.svelte';
    
    let { 
        item, 
        childLeftMarginOffset = "0rem"
    }: { 
        item: TimelineItem; 
        childLeftMarginOffset?: string;
    } = $props();

    let relations = $state<TimelineItem[]>([]);
    let showDetails = $state(false);
    let showExpandedDetails = $state(false);
    
    // Reactive derived value - updates when incidentUsers changes
    let usersOnThisRow = $derived($getUsersOnRow(item.uuid));
    
    // Check if any user is currently editing this row
    let isBeingEditedByOther = $derived(
        usersOnThisRow.some((user) => user.editingRow === item.uuid)
    );

    // Extract related entities and events from enriched data
    let relatedEntities = $derived(
        item.type === 'event' 
            ? (item.data as any).eventEntities || []
            : item.type === 'action'
            ? (item.data as any).actionEntities || []
            : []
    );

    let linkedEvents = $derived(
        item.type === 'action'
            ? (item.data as any).actionEvents || []
            : []
    );

    // Combined display field configuration for both events and actions
    // Fields marked as 'pinned: true' will be displayed as pinneds, others as free-form text
    const displayFieldsConfig = {
        event: [
            { key: "event_type", label: "Event", pinned: true },
            { key: "event_data", label:"Notes", pinned: true, showInNote: true },
            { key: "source", label: "Source", pinned: true },
            { key: "source_reliability", label: "Grade", pinned: true },
            { key: "severity", label: "Severity", pinned: true   },
        ],
        action: [
            { key: "action_type", label: "Action", pinned: true },
            { key: "notes", label: "Notes",pinned: false, showInNote: true },
            { key: "result", label: "Result", pinned: true },
            { key: "outcome", label: "Outcome", pinned: true },
            { key: "tool_used", label: "Tool", pinned: true },
            { key: "tags", label: "Tags", pinned: false },
        ]
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
<div class="timeline-item" style="margin-left: {childLeftMarginOffset};" onclick={toggleExpandedDetails}>

    <div class="main-row">
        <!-- Data Row Fields -->
        <div class="data-row">
            <!-- Timestamp -->
            <div class="timestamp data-section" title="Occurred or Performed At">
                <span class="field-prefix">│</span>
                <span class="timestamp title">TIME</span>
                <span class="timestamp value">{formatTimestamp(item.timestamp)}</span>
            </div>
            <!-- Pinned Entity Fields -->
            {#each displayFieldsConfig[item.type] as field}
                {#if field.pinned && !field.showInNote}
                    <div class="datafield data-section">
                        <span class="field-prefix">│</span>
                        <span class="datafield title">{field.label?.toUpperCase() || '-'}</span>
                        <span class="datafield value">{(item.data as any)[field.key] || '—'}</span>
                    </div>
                {/if}
            {/each}
        </div>
    </div>

    <div class="secondary-row">
        <div class="note-snippet">
            {#each displayFieldsConfig[item.type] as field}
                {#if field.showInNote}
                    <div class="datafield note-section">
                        <span class="field-prefix">  └─</span>
                        <span class="datafield value">{(item.data as any)[field.key] || '—'}</span>
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
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
{#if showExpandedDetails}
    <div class="expanded-details" onclick={(e) => e.stopPropagation()}>
        <!-- Two-column layout: Details + Relationship Graph -->
        <div class="details-container">
            <!-- Left Column: Full Details -->
            <div class="details-column">
                <div class="column-header">┌─ FULL DETAILS ─────────────────────────────</div>
                <div class="details-grid">
                    {#each Object.entries(item.data) as [key, value]}
                        {#if value && typeof value !== 'object'}
                            <div class="detail-item">
                                <span class="detail-label">│ {key.replace(/_/g, ' ')}:</span>
                                <span class="detail-value">{value}</span>
                            </div>
                        {/if}
                    {/each}
                </div>
                <div class="column-footer">└────────────────────────────────────────────</div>
            </div>

            <!-- Right Column: Relationship Graph -->
            <div class="graph-column">
                <div class="column-header">┌─ RELATIONSHIPS ────────────────────────────</div>
                <div class="relationship-tree">
                    <div class="tree-root">│ {item.type === 'event' ? '◉ EVENT' : '◆ ACTION'}: {(item.data as any)[item.type === 'event' ? 'event_type' : 'action_type']}</div>
                    
                    <!-- Related Entities -->
                    {#if relatedEntities.length > 0}
                        <div class="tree-branch">
                            <div class="branch-header">├─ Entities ({relatedEntities.length})</div>
                            {#each relatedEntities as rel, idx}
                                <div class="tree-node entity-node">
                                    <span class="node-connector">{idx === relatedEntities.length - 1 && linkedEvents.length === 0 ? '└─' : '├─'}</span>
                                    <span class="node-type">[{rel.entity.entity_type}]</span>
                                    <span class="node-value" title={rel.relation_type || rel.role}>{rel.entity.identifier}</span>
                                    {#if rel.relation_type || rel.role}
                                        <span class="node-meta">({rel.relation_type || rel.role})</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Linked Events (for actions) -->
                    {#if linkedEvents.length > 0}
                        <div class="tree-branch">
                            <div class="branch-header">└─ Linked Events ({linkedEvents.length})</div>
                            {#each linkedEvents as linkEvt, idx}
                                <div class="tree-node event-node">
                                    <span class="node-connector">{idx === linkedEvents.length - 1 ? '  └─' : '  ├─'}</span>
                                    <span class="node-type">[EVENT]</span>
                                    <span class="node-value">{linkEvt.event.event_type}</span>
                                    {#if linkEvt.relation_type}
                                        <span class="node-meta">({linkEvt.relation_type})</span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    {/if}

                    <!-- Empty state -->
                    {#if relatedEntities.length === 0 && linkedEvents.length === 0}
                        <div class="tree-empty">└─ <span class="empty-text">No relationships found</span></div>
                    {/if}
                </div>
                <div class="column-footer">└────────────────────────────────────────────</div>
            </div>
        </div>
    </div>
{/if}

<!-- Related Entities (Child Items) -->
{#if showDetails}
    <div class="related-entities">
        {#each relations as child, childIndex}
            <!-- Recursive render using self-import -->
            <TimelineRow item={child} childLeftMarginOffset={"1.5rem"}/>
        {/each}
    </div>
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
    }

    /* Expanded Details Styles */
    .expanded-details {
        width: 100%;
        margin-top: var(--spacing-xs);
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border-medium);
        border-radius: var(--border-radius-sm);
    }

    .details-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-sm);
        padding: var(--spacing-sm);
    }

    .details-container * {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .details-column,
    .graph-column {
        display: flex;
        flex-direction: column;
        min-height: 200px;
    }

    .column-header,
    .column-footer {
        font-family: 'Courier New', monospace;
        font-size: var(--font-size-xs);
        color: var(--color-accent-primary);
        user-select: none;
    }

    .column-footer {
        margin-top: 0;
        margin-bottom: 0;
    }

    /* Details Grid (Left Column) */
    .details-grid {
        display: flex;
        flex-direction: column;
        font-family: 'Courier New', monospace;
        font-size: var(--font-size-xs);
        line-height: normal;
    }

    .detail-item {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: var(--spacing-sm);
        padding: 2px 0;
    }

    .detail-label {
        color: var(--color-accent-primary);
        text-transform: uppercase;
        font-size: var(--font-size-xs);
    }

    .detail-value {
        color: var(--color-text-primary);
    }

    /* Relationship Tree (Right Column) */
    .relationship-tree {
        font-family: 'Courier New', monospace;
        font-size: var(--font-size-xs);
        line-height: 1.6;
        color: var(--color-text-primary);
    }

    .tree-root {
        color: var(--color-accent-primary);
        font-weight: bold;
        margin-bottom: 0;
        padding-left: 0;
    }

    .tree-branch {
        margin-bottom: 0;
        padding-left: 0;
    }

    .branch-header {
        color: var(--color-accent-secondary);
        font-weight: bold;
        margin-bottom: 0;
    }

    .tree-node {
        display: flex;
        align-items: baseline;
        padding-left: var(--spacing-sm);
        transition: background 0.15s ease;
    }

    .tree-node:hover {
        background: var(--color-bg-hover);
        cursor: pointer;
    }

    .node-connector {
        color: var(--color-border-medium);
        user-select: none;
        min-width: 20px;
    }

    .node-type {
        color: var(--color-accent-warning);
        font-weight: bold;
        min-width: 80px;
    }

    .node-value {
        color: var(--color-text-primary);
        font-weight: bold;
    }

    .node-meta {
        color: var(--color-text-secondary);
        font-style: italic;
        font-size: calc(var(--font-size-xs) - 1px);
    }

    .tree-empty {
        padding-left: var(--spacing-xs);
        color: var(--color-border-medium);
    }

    .empty-text {
        color: var(--color-text-tertiary);
        font-style: italic;
    }

    /* Entity/Event specific node styling */
    .entity-node .node-type {
        color: var(--color-accent-warning);
    }

    .event-node .node-type {
        color: var(--color-accent-primary);
    }

    /* Presence indicators positioning */
    .presence-indicators {
        display: flex;
        gap: 4px;
        padding: var(--spacing-xs);
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

