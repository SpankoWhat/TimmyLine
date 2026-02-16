<script lang="ts">
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import ResizableDivider from './ResizableDivider.svelte';
    import JsonViewer from './JsonViewer.svelte';

    let {
        item,
        type,
        columnRatio = $bindable(0.30),
        onEdit,
        onDelete
    }: {
        item: TimelineItem;
        type: 'event' | 'action';
        columnRatio: number;
        onEdit: (item: TimelineItem) => void;
        onDelete: (uuid: string) => void;
    } = $props();

    /** Keys that contain JSON data and should be rendered with the JSON viewer */
    const jsonFieldKeys = new Set(['event_data', 'action_data']);

    // Extract related entities and events from enriched data
    let relatedEntities = $derived(
        type === 'event'
            ? (item.data as any).eventEntities || []
            : type === 'action'
            ? (item.data as any).actionEntities || []
            : []
    );

    let linkedEvents = $derived(
        type === 'action'
            ? (item.data as any).actionEvents || []
            : []
    );
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="expanded-details" onclick={(e) => e.stopPropagation()}>
    <!-- Two-column layout: Details + Relationship Graph -->
    <div class="details-container" style="grid-template-columns: {1 - columnRatio}fr auto {columnRatio}fr;">
        <!-- Left Column: Full Details -->
        <div class="details-column">
            <div class="column-header">┌─ FULL DETAILS ─────────────────────────────</div>
            <div class="details-grid">
                {#each Object.entries(item.data) as [key, value] (key)}
                    {#if value && typeof value !== 'object'}
                        {#if jsonFieldKeys.has(key)}
                            <div class="detail-item">
                                <span class="detail-label">│ {key.replace(/_/g, ' ')}:</span>
                                <span class="detail-value"></span>
                            </div>
                            <div class="json-viewer-slot">
                                <JsonViewer data={String(value)} />
                            </div>
                        {:else}
                            <div class="detail-item">
                                <span class="detail-label">│ {key.replace(/_/g, ' ')}:</span>
                                <span class="detail-value">{value}</span>
                            </div>
                        {/if}
                    {/if}
                {/each}
            </div>
            <div class="column-footer">└────────────────────────────────────────────</div>
        </div>

        <!-- Resize Divider -->
        <ResizableDivider bind:columnRatio />

        <!-- Right Column: Relationship Graph -->
        <div class="graph-column">
            <div class="column-header">┌─ RELATIONSHIPS ────────────────────────────</div>
            <div class="relationship-tree">
                <div class="tree-root">│ {type === 'event' ? '◉ EVENT' : '◆ ACTION'}: {(item.data as any)[type === 'event' ? 'event_type' : 'action_type']}</div>

                <!-- Related Entities -->
                {#if relatedEntities.length > 0}
                    <div class="tree-branch">
                        <div class="branch-header">├─ Entities ({relatedEntities.length})</div>
                        {#each relatedEntities as rel, idx (rel.entity?.uuid ?? idx)}
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
                        {#each linkedEvents as linkEvt, idx (linkEvt.event?.uuid ?? idx)}
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

<style>
    /* Expanded Details Styles */
    .expanded-details {
        width: 100%;
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border-medium);
        border-radius: var(--border-radius-sm);
    }

    .details-container {
        display: grid;
        grid-template-columns: .8fr 0.60fr;
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
    }

    .detail-label {
        color: var(--color-accent-primary);
        text-transform: uppercase;
        font-size: var(--font-size-xs);
    }

    .detail-value {
        color: var(--color-text-primary);
    }

    /* JSON Viewer Slot */
    .json-viewer-slot {
        margin-left: var(--spacing-sm);
    }

    /* Relationship Tree (Right Column) */
    .relationship-tree {
        font-family: 'Courier New', monospace;
        font-size: var(--font-size-xs);
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
</style>
