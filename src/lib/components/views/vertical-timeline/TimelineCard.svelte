<script lang="ts">
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import type { DisplayFieldsConfiguration, DisplayField } from '$lib/config/displayFieldsConfig';
    import type { TimelineEvent } from '$lib/types/events';
    import type { InvestigationAction } from '$lib/types/actions';
    import { analystsByUuid, highlightedItemUuids } from '$lib/stores/cacheStore';
    import { timePreferences } from '$lib/stores/timePreferencesStore';
    import { api } from '$lib/client';
    import { emitViewRow, emitIdle, getUsersOnRow } from '$lib/stores/collabStore';
    import { modalStore, createModalConfig } from '$lib/modals/ModalRegistry';
    import type { EntityType } from '$lib/modals/types';
    import { getFieldValue } from '$lib/utils/fieldUtils';
    import TimelineRowDetails from '$lib/components/views/default-log/TimelineRowDetails.svelte';

    let {
        item,
        displayFieldsConfig
    }: {
        item: TimelineItem;
        displayFieldsConfig: DisplayFieldsConfiguration;
    } = $props();

    let showExpandedDetails = $state(false);
    let columnRatio = $state(0.30);

    let usersOnThisRow = $derived($getUsersOnRow(item.uuid));
    let isBeingEditedByOther = $derived(
        usersOnThisRow.some((user) => user.editingRow === item.uuid)
    );
    let isHighlighted = $derived($highlightedItemUuids.has(item.uuid));

    let fieldValueContext = $derived({
        analystLookup: $analystsByUuid,
        timePreferences: $timePreferences
    });

    function toggleExpandedDetails() {
        if (showExpandedDetails) {
            showExpandedDetails = false;
            emitIdle();
            return;
        }
        showExpandedDetails = true;
        emitViewRow(item.uuid);
    }

    function handleCardKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpandedDetails();
        } else if (e.key === 'Escape' && showExpandedDetails) {
            e.preventDefault();
            showExpandedDetails = false;
            emitIdle();
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

        const incident_id = (item.data as Record<string, unknown>).incident_id as string | undefined;

        try {
            if (item.type === 'event') {
                await api.events.delete(uuid, { incident_id });
            } else if (item.type === 'action') {
                await api.actions.delete(uuid, { incident_id });
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

    function getVisibleFields(): DisplayField[] {
        return displayFieldsConfig[item.type]
            .filter((f) => f.pinned && f.kind !== 'system')
            .sort((a, b) => a.order - b.order);
    }

    function getTypeLabel(): string {
        return item.type === 'event'
            ? (item.data as TimelineEvent).event_type
            : (item.data as InvestigationAction).action_type;
    }

    function getNotesPreview(): string | null {
        const notes = (item.data as Record<string, unknown>).notes as string | undefined;
        if (!notes) return null;
        return notes.length > 150 ? notes.slice(0, 150) + '…' : notes;
    }

    function severityClass(): string {
        if (item.type !== 'event') return '';
        const sev = (item.data as TimelineEvent).severity;
        switch (sev) {
            case 'critical': return 'severity-critical';
            case 'high': return 'severity-high';
            case 'medium': return 'severity-medium';
            case 'low': return 'severity-low';
            default: return 'severity-info';
        }
    }

    function getRelatedEntityCount(): number {
        const entities = item.type === 'event'
            ? (item.data as any).eventEntities
            : (item.data as any).actionEntities;
        return entities?.length ?? 0;
    }
</script>

<div class="timeline-card-wrapper" data-timeline-uuid={item.uuid}>
    <div
        class="timeline-card {item.type}"
        class:highlighted={isHighlighted}
        class:expanded={showExpandedDetails}
        role="button"
        tabindex="0"
        aria-expanded={showExpandedDetails}
        onclick={toggleExpandedDetails}
        onkeydown={handleCardKeydown}
    >
        <!-- Card Header -->
        <div class="card-header">
            <div class="card-type-badge">
                {#if item.type === 'event'}
                    <svg class="icon-event" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="5" />
                    </svg>
                {:else}
                    <svg class="icon-action" width="12" height="12" viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true">
                        <path d="M8 2L14 8L8 14L2 8L8 2Z" />
                    </svg>
                {/if}
                <span class="type-label">{getTypeLabel()}</span>
            </div>
            {#if item.type === 'event' && (item.data as TimelineEvent).severity}
                <span class="severity-dot {severityClass()}" title={(item.data as TimelineEvent).severity}></span>
            {/if}
        </div>

        <!-- Card Fields -->
        <div class="card-fields">
            {#each getVisibleFields() as field (field.key)}
                {@const value = getFieldValue(item.data as Record<string, unknown>, field, fieldValueContext)}
                {#if value && value !== '—'}
                    <div class="card-field">
                        <span class="card-field-label">{field.label}</span>
                        <span class="card-field-value">{value}</span>
                    </div>
                {/if}
            {/each}
        </div>

        <!-- Notes Preview -->
        {#if getNotesPreview()}
            <div class="card-notes">
                <span class="card-notes-text">"{getNotesPreview()}"</span>
            </div>
        {/if}

        <!-- Card Footer -->
        <div class="card-footer">
            {#if getRelatedEntityCount() > 0}
                <span class="entity-count">🔗 {getRelatedEntityCount()} entities</span>
            {/if}

            <!-- Presence Indicators -->
            {#if usersOnThisRow.length > 0}
                <div class="presence-indicators">
                    {#each usersOnThisRow as user (user.analystName)}
                        <div
                            class="user-avatar"
                            style:background-color={randomColorFromString(user.analystName)}
                            title={user.analystName}
                        ></div>
                    {/each}
                </div>
            {/if}

            <div class="card-spacer"></div>

            <!-- Action buttons -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="card-actions" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
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

    <!-- Expanded Details -->
    {#if showExpandedDetails}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="card-expanded" onclick={(e) => e.stopPropagation()} onkeydown={() => {}}>
            <TimelineRowDetails
                {item}
                type={item.type}
                bind:columnRatio
                onEdit={editEntity}
                onDelete={deleteEntity}
            />
        </div>
    {/if}
</div>

<style>
    /* === Card Wrapper === */
    .timeline-card-wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        max-width: 70vw;
    }

    /* === Card === */
    .timeline-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        padding: var(--space-2) var(--space-3);
        background: hsl(var(--bg-surface-100));
        border: var(--border-width) solid hsl(var(--border-default));
        border-radius: var(--radius-lg);
        cursor: pointer;
        transition: var(--transition-colors);
    }

    .timeline-card.event {
        border-left: var(--border-width-divider) solid hsl(var(--brand-default));
    }

    .timeline-card.action {
        border-left: var(--border-width-divider) solid hsl(var(--info-default));
    }

    .timeline-card:hover {
        background: hsl(var(--bg-surface-200));
        border-color: hsl(var(--border-strong));
    }

    /* Keep left accent on hover */
    .timeline-card.event:hover {
        border-left-color: hsl(var(--brand-default));
    }

    .timeline-card.action:hover {
        border-left-color: hsl(var(--info-default));
    }

    .timeline-card.highlighted {
        border-color: hsl(var(--brand-default));
        box-shadow: 0 0 0 1px hsl(var(--brand-default) / 0.3);
    }

    /* Keep left accent on highlighted */
    .timeline-card.event.highlighted {
        border-left-color: hsl(var(--brand-default));
    }

    .timeline-card.action.highlighted {
        border-left-color: hsl(var(--info-default));
    }

    .timeline-card:focus-visible {
        outline: var(--border-width-thick) solid hsl(var(--border-focus));
        outline-offset: 1px;
    }

    /* === Card Header === */
    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
    }

    .card-type-badge {
        display: flex;
        align-items: center;
        gap: var(--space-1\.5);
    }

    .icon-event {
        color: hsl(var(--brand-default));
    }

    .icon-action {
        color: hsl(var(--info-default));
    }

    .type-label {
        font-family: var(--font-family);
        font-size: var(--text-sm);
        font-weight: var(--font-semibold);
        color: hsl(var(--fg-default));
    }

    .severity-dot {
        width: 8px;
        height: 8px;
        border-radius: var(--radius-full);
        flex-shrink: 0;
    }

    .severity-critical {
        background: hsl(var(--severity-critical));
    }

    .severity-high {
        background: hsl(var(--severity-high));
    }

    .severity-medium {
        background: hsl(var(--severity-medium));
    }

    .severity-low {
        background: hsl(var(--severity-low));
    }

    .severity-info {
        background: hsl(var(--severity-info));
    }

    /* === Card Fields === */
    .card-fields {
        display: flex;
        flex-direction: column;
        gap: var(--space-0\.5);
        padding: var(--space-1) 0;
        border-top: var(--border-width) solid hsl(var(--border-muted));
    }

    .card-field {
        display: flex;
        align-items: baseline;
        gap: var(--space-2);
    }

    .card-field-label {
        font-family: var(--font-family);
        font-size: var(--text-2xs);
        font-weight: var(--font-medium);
        color: hsl(var(--fg-lighter));
        text-transform: uppercase;
        letter-spacing: var(--tracking-wide);
        min-width: 80px;
        flex-shrink: 0;
    }

    .card-field-value {
        font-family: var(--font-mono);
        font-size: var(--text-xs);
        color: hsl(var(--fg-data));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    /* === Card Notes === */
    .card-notes {
        padding: var(--space-1) 0;
        border-top: var(--border-width) solid hsl(var(--border-muted));
    }

    .card-notes-text {
        font-family: var(--font-family);
        font-size: var(--text-xs);
        font-style: italic;
        color: hsl(var(--fg-lighter));
        line-height: var(--leading-snug);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    /* === Card Footer === */
    .card-footer {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding-top: var(--space-1);
        border-top: var(--border-width) solid hsl(var(--border-muted));
    }

    .entity-count {
        font-family: var(--font-mono);
        font-size: var(--text-2xs);
        color: hsl(var(--fg-lighter));
    }

    .presence-indicators {
        display: flex;
        gap: var(--space-1);
    }

    .user-avatar {
        width: 10px;
        height: 10px;
        border-radius: var(--radius-full);
        flex-shrink: 0;
    }

    .card-spacer {
        flex: 1;
    }

    /* === Action Buttons === */
    .card-actions {
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

    /* === Expanded Details === */
    .card-expanded {
        padding-left: var(--space-2);
    }

    /* === Reduced Motion === */
    @media (prefers-reduced-motion: reduce) {
        .timeline-card,
        .action-btn {
            transition-duration: 0.01ms !important;
        }
    }
</style>
