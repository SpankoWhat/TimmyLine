<script lang="ts">
    import type { DisplayField } from '$lib/config/displayFieldsConfig';

    let {
        title,
        type,
        sortedPinnedFields,
        unpinnedFields,
        dynamicParentFields,
        pinnedDynamicFields,
        unpinnedDynamicFieldsByParent,
        onTogglePin,
        onDragStart,
        onDragOver,
        onDragLeave,
        onDrop,
        onDragEnd,
        dragOverField
    }: {
        title: string;
        type: 'event' | 'action';
        sortedPinnedFields: DisplayField[];
        unpinnedFields: DisplayField[];
        dynamicParentFields: DisplayField[];
        pinnedDynamicFields: DisplayField[];
        unpinnedDynamicFieldsByParent: Map<string, DisplayField[]>;
        onTogglePin: (type: 'event' | 'action', fieldKey: string) => void;
        onDragStart: (type: 'event' | 'action', fieldKey: string) => void;
        onDragOver: (e: DragEvent, type: 'event' | 'action', fieldKey: string) => void;
        onDragLeave: () => void;
        onDrop: (type: 'event' | 'action', fieldKey: string) => void;
        onDragEnd: () => void;
        dragOverField: { type: 'event' | 'action'; key: string } | null;
    } = $props();
</script>

<div class="field-section">
    <div class="field-section-title">{title}</div>

    <!-- Pinned fields (draggable) -->
    {#if sortedPinnedFields.length > 0}
        <div class="field-subsection-title">Pinned (drag to reorder)</div>
        <div class="field-list pinned-list">
            {#each sortedPinnedFields as field (field.key)}
                <div
                    class="field-row draggable"
                    class:drag-over={dragOverField?.type === type && dragOverField?.key === field.key}
                    draggable="true"
                    ondragstart={() => onDragStart(type, field.key)}
                    ondragover={(e) => onDragOver(e, type, field.key)}
                    ondragleave={onDragLeave}
                    ondrop={() => onDrop(type, field.key)}
                    ondragend={onDragEnd}
                >
                    <span class="drag-handle">⋮⋮</span>
                    <label class="field-checkbox-label">
                        <input
                            type="checkbox"
                            checked={field.pinned}
                            onchange={() => onTogglePin(type, field.key)}
                        />
                        <span>{field.label}</span>
                    </label>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Unpinned fields -->
    {#if unpinnedFields.length > 0}
        <div class="field-subsection-title">Available</div>
        <div class="field-list">
            {#each unpinnedFields as field (field.key)}
                <div class="field-row">
                    <label class="field-checkbox-label">
                        <input
                            type="checkbox"
                            checked={field.pinned}
                            onchange={() => onTogglePin(type, field.key)}
                        />
                        <span>{field.label}</span>
                    </label>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Dynamic Fields (from JSON) -->
    {#each dynamicParentFields as parentField (parentField.key)}
        {@const dynamicFields = unpinnedDynamicFieldsByParent.get(parentField.key) || []}
        {#if dynamicFields.length > 0 || pinnedDynamicFields.filter(f => f.parentKey === parentField.key).length > 0}
            <div class="field-subsection-title dynamic-section">
                <span class="dynamic-icon">◈</span> {parentField.label} Fields
            </div>
            <!-- Pinned dynamic fields for this parent -->
            {@const pinnedForParent = pinnedDynamicFields.filter(f => f.parentKey === parentField.key)}
            {#if pinnedForParent.length > 0}
                <div class="field-list pinned-list dynamic-list">
                    {#each pinnedForParent as field (field.key)}
                        <div
                            class="field-row draggable dynamic-field"
                            class:drag-over={dragOverField?.type === type && dragOverField?.key === field.key}
                            draggable="true"
                            ondragstart={() => onDragStart(type, field.key)}
                            ondragover={(e) => onDragOver(e, type, field.key)}
                            ondragleave={onDragLeave}
                            ondrop={() => onDrop(type, field.key)}
                            ondragend={onDragEnd}
                        >
                            <span class="drag-handle">⋮⋮</span>
                            <label class="field-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={field.pinned}
                                    onchange={() => onTogglePin(type, field.key)}
                                />
                                <span>{field.label}</span>
                            </label>
                        </div>
                    {/each}
                </div>
            {/if}
            <!-- Unpinned dynamic fields for this parent -->
            {#if dynamicFields.length > 0}
                <div class="field-list dynamic-list">
                    {#each dynamicFields as field (field.key)}
                        <div class="field-row dynamic-field">
                            <label class="field-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={field.pinned}
                                    onchange={() => onTogglePin(type, field.key)}
                                />
                                <span>{field.label}</span>
                            </label>
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}
    {/each}
</div>

<style>
    .field-section {
        margin-bottom: var(--spacing-sm);
    }

    .field-section:last-of-type {
        margin-bottom: var(--spacing-md);
    }

    .field-section-title {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        color: var(--color-accent-primary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--spacing-xs);
        padding-bottom: var(--spacing-xs);
        border-bottom: 1px solid var(--color-border-subtle);
    }

    .field-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
    }

    .field-list.pinned-list {
        background: var(--color-bg-tertiary);
        border-radius: var(--border-radius-sm);
        padding: var(--spacing-xs);
    }

    .field-subsection-title {
        font-size: 9px;
        color: var(--color-text-tertiary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: var(--spacing-xs);
        margin-bottom: calc(var(--spacing-xs) / 2);
    }

    .field-row {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        justify-content: flex-start;
    }

    .field-row.draggable {
        cursor: grab;
        border: 1px solid transparent;
        border-radius: var(--border-radius-sm);
        padding: 2px;
        margin: -2px;
        transition: all 0.15s ease;
    }

    .field-row.draggable:hover {
        background: var(--color-bg-hover);
        border-color: var(--color-border-medium);
    }

    .field-row.draggable:active {
        cursor: grabbing;
    }

    .field-row.drag-over {
        border-color: var(--color-accent-primary);
        background: rgba(0, 255, 0, 0.1);
    }

    .drag-handle {
        color: var(--color-text-tertiary);
        font-size: 10px;
        user-select: none;
        cursor: grab;
        padding: 0 2px;
    }

    .field-row.draggable:hover .drag-handle {
        color: var(--color-accent-primary);
    }

    .field-checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        cursor: pointer;
        font-size: var(--font-size-xs);
        color: var(--color-text-primary);
        user-select: none;
        transition: background 0.2s;
        padding: var(--spacing-xs) calc(var(--spacing-xs) / 2);
        border-radius: var(--border-radius-sm);
        flex: 1;
    }

    .field-checkbox-label:hover {
        background: var(--color-bg-hover);
    }

    .field-checkbox-label input[type="checkbox"] {
        cursor: pointer;
        accent-color: var(--color-accent-primary);
    }

    /* Dynamic field styles */
    .dynamic-section {
        color: var(--color-accent-warning);
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .dynamic-icon {
        font-size: 8px;
    }

    .dynamic-list {
        border-left: 2px solid var(--color-accent-warning);
        margin-left: var(--spacing-xs);
        padding-left: var(--spacing-xs);
    }

    .dynamic-field .field-checkbox-label {
        color: var(--color-text-secondary);
    }

    .dynamic-field .field-checkbox-label:hover {
        color: var(--color-text-primary);
    }

    .dynamic-field input[type="checkbox"] {
        accent-color: var(--color-accent-warning);
    }
</style>
