<script lang="ts">
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import { currentSelectedIncident } from '$lib/stores/cacheStore';
    import { emitViewRow, emitIdle, getUsersOnRow } from '$lib/stores/collabStore';
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
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="timeline-item" style="margin-left: {childLeftMarginOffset};" onclick={toggleExpandedDetails}>
    <div class="main-row">
        <!-- Data Row Fields -->
        <div class="data-row">
            <!-- Timestamp -->
            <div class="timestamp data-section" title="Occurred or Performed At">
                <span class="timestamp title">Time</span>
                <span class="timestamp value">{formatTimestamp(item.timestamp)}</span>
            </div>
            <!-- Pinned Entity Fields -->
            {#each displayFieldsConfig[item.type] as field}
                {#if field.pinned && !field.showInNote}
                    <div class="datafield data-section">
                        <span class="datafield title">{field.label || '-'}</span>
                        <span class="datafield value">{(item.data as any)[field.key] || '—'}</span>
                    </div>
                {/if}
            {/each}
        </div>
        
        <!-- Action Buttons -->
        <div class="actions" onclick={(e) => e.stopPropagation()}>
            <button
            class="action-btn"
            title="Delete"
            onclick={() => deleteEntity(item.uuid)}>
            <span class="btn-icon">❌</span>
        </button>
        </div>
    </div>
    
    
    <div class="note-snippet">
        {#each displayFieldsConfig[item.type] as field}
            {#if field.showInNote}
                <div class="datafield note-section">
                    <span class="datafield value">{(item.data as any)[field.key] || '—'}</span>
                </div>
            {/if}
        {/each}
    </div>
</div>

<!-- Presence Indicators -->
{#if usersOnThisRow.length > 0}
    <div class="presence-indicators">
        {#each usersOnThisRow as user}
            <div 
                class="user-avatar"
                style:border-color={randomColorFromString(user.analystName)}
                style:background-color={randomColorFromString(user.analystName)}
                title={`${user.analystName} is ${user.isEditing ? 'editing' : 'viewing'} this item`}
                        >
            </div>
        {/each}
    </div>
{/if}


<!-- Expanded Details View -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
{#if showExpandedDetails}
    <div class="expanded-details" onclick={(e) => e.stopPropagation()}>
        <!-- Related Entities Display -->
        {#if relatedEntities.length > 0}
            {#each relatedEntities as rel}
                <span class="datafield pinned entity-badge" title={rel.role || rel.relation_type || 'Related'}>
                    <span class="field-label">{rel.entity.entity_type}</span>
                    <span class="field-value">{rel.entity.identifier}</span>
                </span>
            {/each}
        {/if}

        <!-- Linked Events Display (for actions) -->
        {#if linkedEvents.length > 0}
            {#each linkedEvents as linkEvt}
                <span class="datafield pinned linked-event" title={linkEvt.relation_type || 'Related Event'}>
                    <span class="field-label">→ {linkEvt.relation_type}</span>
                    <span class="field-value">{linkEvt.event.event_type}</span>
                </span>
            {/each}
        {/if}
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
            <TimelineRow item={child} childLeftMarginOffset={"1.5rem"}/>
        {/each}
    </div>
{/if}

<style>
    .timeline-item {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .timeline-item:hover {
        background: var(--color-bg-hover);
    }

    .main-row {
        display: flex;
        flex-direction: row;
        width: 100%;
        justify-content: space-between;
    }

    .data-row {
        display: flex;
        flex-direction: row;
    }

    .data-section {
        display: flex;
        flex-direction: column;
        padding-right: var(--spacing-xs);
        min-width: 80px;
    }

    .data-section .title {
        font-size: var(--font-size-xs);
        color: var(--color-accent-primary);
        height: 10px;
    }

    .data-section .value {
        font-size: var(--font-size-sm);
        font-weight: bold;
    }

    .action-btn {
        justify-self: right;
    }

    .note-snippet {
        font-style: italic;
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        width: 100%;
        line-height: normal;
    }

</style>

