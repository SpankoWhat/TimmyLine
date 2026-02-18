<script lang="ts">
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import { currentSelectedIncident, highlightedItemUuids } from '$lib/stores/cacheStore';
    import { emitViewRow, emitIdle, getUsersOnRow } from '$lib/stores/collabStore';
    import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
    import type { EntityType, DisplayFieldsConfig } from '$lib/modals/types';
    import type { DisplayField } from '$lib/config/displayFieldsConfig';
    import { fade } from 'svelte/transition';
    import { getFieldValue } from '$lib/utils/fieldUtils';
    import TimelineRowDetails from './TimelineRowDetails.svelte';
    
    let { 
        item,
        displayFieldsConfig
    }: { 
        item: TimelineItem,
        displayFieldsConfig: DisplayFieldsConfig;
    } = $props();

    let showExpandedDetails = $state(false);
    let columnRatio = $state(0.30);
    
    let usersOnThisRow = $derived($getUsersOnRow(item.uuid));
    
    let isBeingEditedByOther = $derived(
        usersOnThisRow.some((user) => user.editingRow === item.uuid)
    );

    let isHighlighted = $derived($highlightedItemUuids.has(item.uuid));

    function getDisplayValue(field: DisplayField): string {
        return getFieldValue(item.data as Record<string, unknown>, field);
    }

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

    function handleRowKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpandedDetails();
        }
    }

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
        const entityType: EntityType = item.type === 'event' 
            ? 'timeline_event' 
            : 'investigation_action';
        
        modalStore.open(createModalConfig(entityType, 'edit', item.data));
    }
</script>

<div 
    class="timeline-item" 
    class:highlighted={isHighlighted}
    data-timeline-uuid={item.uuid}
    role="button"
    tabindex="0"
    aria-expanded={showExpandedDetails}
    onclick={toggleExpandedDetails}
    onkeydown={handleRowKeydown}
>
    <div class="main-row">
        <div class="data-row">
            <!-- Timestamp -->
            <div class="data-field timestamp-field" title="Occurred or Performed At">
                <span class="field-prefix">│</span>
                <span class="field-label">TIME</span>
                <span class="field-value">{formatTimestamp(item.timestamp)}</span>
            </div>

            <!-- Pinned Entity Fields -->
            {#each [...displayFieldsConfig[item.type]].filter(f => f.pinned && f.kind !== 'system').sort((a, b) => a.order - b.order) as field (field.key)}
                {@const fieldValue = getDisplayValue(field)}
                {#if fieldValue && fieldValue !== '—'}
                    <div 
                        class="data-field" 
                        class:dynamic-field={field.kind === 'dynamic'}
                        transition:fade={{ duration: 180 }}
                    >
                        <span class="field-prefix">{field.kind === 'dynamic' ? '◈' : '│'}</span>
                        <span class="field-label">{field.label?.toUpperCase() || '-'}</span>
                        <span class="field-value">{fieldValue}</span>
                    </div>
                {/if}
            {/each}
        </div>
    </div>

    <div class="secondary-row">
        <div class="note-snippet">
            {#each displayFieldsConfig[item.type] as field (field.key)}
                {#if field.kind === 'system' && field.showInNote}
                    <div 
                        class="note-field"
                        transition:fade={{ duration: 180 }}
                    >
                        <span class="note-prefix">└─</span>
                        <span class="note-value">{getDisplayValue(field)}</span>
                    </div>
                {/if}
            {/each}
        </div>
        
        <!-- Presence Indicators -->
        {#if usersOnThisRow.length > 0}
            <div class="presence-indicators">
                {#each usersOnThisRow as user (user.analystName)}
                    <div 
                        class="user-avatar"
                        style:background-color={randomColorFromString(user.analystName)}
                        title={`${user.analystName} is ${user.editingRow === item.uuid ? 'editing' : 'viewing'} this item`}
                    ></div>
                {/each}
            </div>
        {/if}
        
        <!-- Action Buttons -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="actions" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
            <button
                class="action-btn edit"
                disabled={isBeingEditedByOther}
                title={isBeingEditedByOther ? 'Another user is editing this item' : 'Edit'}
                aria-label={isBeingEditedByOther ? 'Another user is editing this item' : 'Edit this item'}
                onclick={editEntity}
            >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z"/>
                </svg>
            </button>
            <button
                class="action-btn delete"
                title="Delete"
                aria-label="Delete this item"
                onclick={() => deleteEntity(item.uuid)}
            >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 4l8 8M12 4l-8 8"/>
                </svg>
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
    /* === Row Container === */
    .timeline-item {
        display: flex;
        flex-direction: column;
        background: hsl(var(--bg-surface-100));
        border: var(--border-width) solid hsl(var(--border-default));
        border-radius: var(--radius-sm);
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        line-height: var(--leading-snug);
        transition: var(--transition-colors);
        cursor: pointer;
    }

    .timeline-item:hover {
        background: hsl(var(--bg-surface-200));
        border-color: hsl(var(--border-strong));
    }

    .timeline-item.highlighted {
        border-color: hsl(var(--brand-default));
        box-shadow: 0 0 0 1px hsl(var(--brand-default) / 0.3);
    }

    .timeline-item:focus-visible {
        outline: var(--border-width-thick) solid hsl(var(--border-focus));
        outline-offset: 1px;
    }

    /* === Main Row === */
    .main-row {
        display: flex;
        align-items: center;
        padding: var(--space-1) var(--space-3);
        gap: var(--space-3);
    }

    .data-row {
        display: flex;
        flex-direction: row;
        gap: var(--space-3);
        flex-wrap: nowrap;
        flex: 1;
        overflow: hidden;
    }

    /* === Data Fields === */
    .data-field {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        gap: var(--space-1);
        min-width: fit-content;
        white-space: nowrap;
    }

    .field-prefix {
        color: hsl(var(--border-default));
        font-weight: var(--font-bold);
        user-select: none;
    }

    .field-label {
        font-size: var(--text-2xs);
        color: hsl(var(--fg-lighter));
        font-weight: var(--font-medium);
        text-transform: uppercase;
        letter-spacing: var(--tracking-wide);
    }

    .timestamp-field .field-label {
        color: hsl(var(--fg-muted));
    }

    .field-value {
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        color: hsl(var(--fg-data));
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* === Dynamic Field Variant === */
    .dynamic-field .field-prefix {
        color: hsl(var(--warning-default));
        font-size: var(--text-2xs);
    }

    .dynamic-field .field-label {
        color: hsl(var(--warning-default));
    }

    .dynamic-field .field-value {
        color: hsl(var(--fg-light));
    }

    /* === Secondary Row === */
    .secondary-row {
        display: flex;
        align-items: center;
        padding: 0 var(--space-3) var(--space-1);
        gap: var(--space-2);
    }

    /* === Note Snippet === */
    .note-snippet {
        font-style: italic;
        font-size: var(--text-2xs);
        color: hsl(var(--fg-lighter));
        flex: 1;
        line-height: var(--leading-snug);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .note-field {
        display: flex;
        gap: var(--space-0\.5);
    }

    .note-prefix {
        color: hsl(var(--fg-muted));
        user-select: none;
    }

    .note-value {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* === Presence Indicators === */
    .presence-indicators {
        display: flex;
        gap: var(--space-1);
        padding-left: var(--space-2);
    }

    .user-avatar {
        width: 10px;
        height: 10px;
        border-radius: var(--radius-full);
        flex-shrink: 0;
    }

    /* === Action Buttons === */
    .actions {
        display: flex;
        gap: var(--space-0\.5);
        align-items: center;
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        padding: 0;
        color: hsl(var(--fg-lighter));
        background: transparent;
        border: var(--border-width) solid transparent;
        border-radius: var(--radius-xs);
        cursor: pointer;
        transition: var(--transition-colors);
    }

    .action-btn:hover {
        background: hsl(var(--bg-surface-300));
        color: hsl(var(--fg-default));
    }

    .action-btn.edit:hover {
        color: hsl(var(--brand-default));
    }

    .action-btn.delete:hover {
        color: hsl(var(--destructive-default));
    }

    .action-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .action-btn:disabled:hover {
        background: transparent;
        color: hsl(var(--fg-lighter));
    }

    .action-btn:focus-visible {
        outline: var(--border-width-thick) solid hsl(var(--border-focus));
        outline-offset: 1px;
    }

    /* === Reduced Motion === */
    @media (prefers-reduced-motion: reduce) {
        .timeline-item,
        .action-btn {
            transition-duration: 0.01ms !important;
        }
    }
</style>

