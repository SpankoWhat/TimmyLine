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
            <div class="column-header">Full Details</div>
            <div class="details-grid">
                {#each Object.entries(item.data) as [key, value] (key)}
                    {#if value && typeof value !== 'object'}
                        {#if jsonFieldKeys.has(key)}
                            <div class="detail-item">
                                <span class="detail-label">{key.replace(/_/g, ' ')}</span>
                                <span class="detail-value"></span>
                            </div>
                            <div class="json-viewer-slot">
                                <JsonViewer data={String(value)} />
                            </div>
                        {:else}
                            <div class="detail-item">
                                <span class="detail-label">{key.replace(/_/g, ' ')}</span>
                                <span class="detail-value">{value}</span>
                            </div>
                        {/if}
                    {/if}
                {/each}
            </div>
        </div>

        <!-- Resize Divider -->
        <ResizableDivider bind:columnRatio />

        <!-- Right Column: Relationship Graph -->
        <div class="graph-column">
            <div class="column-header">Relationships</div>
            <div class="relationship-tree">
                <div class="tree-root">{type === 'event' ? '◉ EVENT' : '◆ ACTION'}: {(item.data as any)[type === 'event' ? 'event_type' : 'action_type']}</div>

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
        </div>
    </div>
</div>

<style>
    /* Expanded Details Container */
    .expanded-details {
        width: 100%;
        background: hsl(var(--bg-surface-75));
        border: var(--border-width) solid hsl(var(--border-default));
        border-radius: var(--radius-sm);
        overflow: hidden;
    }

    /* Two-column grid layout */
    .details-container {
        display: grid;
        gap: var(--space-2);
        padding: var(--space-3);
    }

    .details-column,
    .graph-column {
        display: flex;
        flex-direction: column;
        min-height: 200px;
    }

    /* Column Headers */
    .column-header {
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        color: hsl(var(--fg-light));
        text-transform: uppercase;
        letter-spacing: var(--tracking-wide);
        padding-bottom: var(--space-2);
        border-bottom: var(--border-width) solid hsl(var(--border-muted));
        margin-bottom: var(--space-2);
        user-select: none;
    }

    /* Details Grid (Left Column) */
    .details-grid {
        display: flex;
        flex-direction: column;
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        line-height: var(--leading-snug);
    }

    .detail-item {
        display: grid;
        grid-template-columns: 180px 1fr;
        gap: var(--space-2);
        padding: var(--space-0\.5) 0;
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        line-height: var(--leading-snug);
    }

    .detail-label {
        color: hsl(var(--fg-lighter));
        text-transform: uppercase;
        font-size: var(--text-2xs);
        font-weight: var(--font-medium);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .detail-value {
        color: hsl(var(--fg-data));
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    /* JSON Viewer Slot */
    .json-viewer-slot {
        margin-left: var(--space-2);
        padding: var(--space-2);
        background: hsl(var(--bg-alternative));
        border-radius: var(--radius-sm);
        border: var(--border-width) solid hsl(var(--border-muted));
    }

    /* Relationship Tree (Right Column) */
    .relationship-tree {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: hsl(var(--fg-default));
    }

    .tree-root {
        color: hsl(var(--brand-default));
        font-weight: var(--font-semibold);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        margin-bottom: var(--space-1);
    }

    .tree-branch {
        margin-bottom: 0;
        padding-left: 0;
    }

    .branch-header {
        color: hsl(var(--info-default));
        font-weight: var(--font-semibold);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
    }

    .tree-node {
        display: flex;
        align-items: baseline;
        gap: var(--space-1);
        padding: var(--space-0\.5) var(--space-1);
        transition: var(--transition-colors);
        flex-wrap: wrap;
    }

    .tree-node:hover {
        background: hsl(var(--bg-surface-200));
        border-radius: var(--radius-xs);
        cursor: pointer;
    }

    .node-connector {
        color: hsl(var(--fg-muted));
        user-select: none;
        min-width: 20px;
        flex-shrink: 0;
    }

    .node-type {
        color: hsl(var(--warning-default));
        font-weight: var(--font-semibold);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        min-width: 80px;
        flex-shrink: 0;
    }

    .node-value {
        color: hsl(var(--fg-data));
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        white-space: pre-wrap;
        word-break: break-word;
        overflow-wrap: anywhere;
    }

    .node-meta {
        color: hsl(var(--fg-lighter));
        font-style: italic;
        font-size: var(--text-2xs);
    }

    .tree-empty {
        padding-left: var(--space-1);
        color: hsl(var(--fg-muted));
        font-family: var(--font-mono);
        font-size: var(--text-xs);
    }

    .empty-text {
        color: hsl(var(--fg-lighter));
        font-style: italic;
    }

    /* Entity/Event specific node styling */
    .entity-node .node-type {
        color: hsl(var(--warning-default));
    }

    .event-node .node-type {
        color: hsl(var(--brand-default));
    }
</style>
