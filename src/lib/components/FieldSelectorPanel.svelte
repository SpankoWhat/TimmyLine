<script lang="ts">
    import type { DisplayField } from '$lib/config/displayFieldsConfig';
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import { discoverDynamicFields, mergeFieldConfigs, saveFieldPreferences, loadFieldPreferences, clearFieldPreferences } from '$lib/utils/fieldUtils';
    import { displayFieldsConfig } from '$lib/config/displayFieldsConfig';

    let {
        title,
        type,
        timelineItems,
        fields = $bindable(),
    }: {
        title: string;
        type: 'event' | 'action';
        timelineItems: TimelineItem[];
        fields: DisplayField[];
    } = $props();

    // Drag and drop state — scoped to this panel
    let draggedField: string | null = $state(null);
    let dragOverField: string | null = $state(null);

    let searchQuery = $state('');

    // Discover dynamic fields from timeline data for this type
    const discoveredDynamicFields = $derived(
        discoverDynamicFields(
            timelineItems.map(item => ({ type: item.type, data: item.data as Record<string, unknown> })),
            displayFieldsConfig,
            type
        )
    );

    // Merge static fields with discovered dynamic fields, preserving user state
    $effect(() => {
        const existingDynamic = fields.filter(f => f.kind === 'dynamic');

        const mergedFields = mergeFieldConfigs(
            displayFieldsConfig[type],
            discoveredDynamicFields,
            existingDynamic
        );

        const currentKeys = new Set(fields.map(f => f.key));
        let newFields = mergedFields.filter(f => !currentKeys.has(f.key));

        if (newFields.length > 0) {
            // Apply any stored preferences to newly discovered dynamic fields
            newFields = loadFieldPreferences(type, newFields);
            fields = [...fields, ...newFields];
        }
    });

    // Persist to localStorage whenever fields change
    $effect(() => {
        saveFieldPreferences(type, fields);
    });

    // Computed deriveds
    const sortedPinnedFields = $derived(
        fields
            .filter(f => f.pinned && f.kind === 'standard')
            .sort((a, b) => a.order - b.order)
    );

    const unpinnedFields = $derived(
        fields.filter(f => !f.pinned && f.kind === 'standard')
    );

    const dynamicParentFields = $derived(
        fields.filter(f => f.kind === 'system' && 'allowDynamicFieldRendering' in f && f.allowDynamicFieldRendering)
    );

    const pinnedDynamicFields = $derived(
        fields.filter(f => f.kind === 'dynamic' && f.pinned).sort((a, b) => a.order - b.order)
    );

    const unpinnedDynamicFieldsByParent = $derived(
        new Map(
            dynamicParentFields.map(parent => [
                parent.key,
                fields.filter(f => f.kind === 'dynamic' && f.parentKey === parent.key && !f.pinned)
            ])
        )
    );

    function matchesSearch(field: DisplayField): boolean {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return field.label.toLowerCase().includes(query) || field.key.toLowerCase().includes(query);
    }

    const filteredSortedPinnedFields = $derived(sortedPinnedFields.filter(matchesSearch));
    const filteredUnpinnedFields = $derived(unpinnedFields.filter(matchesSearch));
    const filteredPinnedDynamicFields = $derived(pinnedDynamicFields.filter(matchesSearch));

    // Toggle pin/unpin
    function toggleFieldPinned(fieldKey: string) {
        const field = fields.find(f => f.key === fieldKey);
        if (field) {
            if (field.pinned) {
                const maxOrder = Math.max(...fields.map(f => f.order));
                field.order = maxOrder + 1;
                field.pinned = false;
            } else {
                const pinnedFields = fields.filter(f => f.pinned);
                const maxPinnedOrder = pinnedFields.length > 0
                    ? Math.max(...pinnedFields.map(f => f.order))
                    : 0;
                field.order = maxPinnedOrder + 1;
                field.pinned = true;
            }
        }
    }

    // Reset to defaults, keeping discovered dynamic fields but unpinning them
    export function resetFieldSelection() {
        clearFieldPreferences(type);
        const dynamicFields = fields.filter(f => f.kind === 'dynamic').map(f => ({ ...f, pinned: false }));
        fields = [...displayFieldsConfig[type].map(f => ({ ...f })), ...dynamicFields];
    }

    // Drag and drop handlers
    function handleDragStart(fieldKey: string) {
        draggedField = fieldKey;
    }

    function handleDragOver(e: DragEvent, fieldKey: string) {
        e.preventDefault();
        if (draggedField && draggedField !== fieldKey) {
            dragOverField = fieldKey;
        }
    }

    function handleDragLeave() {
        dragOverField = null;
    }

    function handleDrop(targetFieldKey: string) {
        if (!draggedField) {
            draggedField = null;
            dragOverField = null;
            return;
        }

        const draggedFieldObj = fields.find(f => f.key === draggedField);
        const targetFieldObj = fields.find(f => f.key === targetFieldKey);

        if (draggedFieldObj && targetFieldObj && draggedFieldObj.pinned && targetFieldObj.pinned) {
            const pinnedFields = fields
                .filter(f => f.pinned && f.kind !== 'system')
                .sort((a, b) => a.order - b.order);

            const draggedIndex = pinnedFields.findIndex(f => f.key === draggedField);
            const targetIndex = pinnedFields.findIndex(f => f.key === targetFieldKey);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const [removed] = pinnedFields.splice(draggedIndex, 1);
                pinnedFields.splice(targetIndex, 0, removed);

                pinnedFields.forEach((field, index) => {
                    const stateField = fields.find(f => f.key === field.key);
                    if (stateField) {
                        stateField.order = index + 1;
                    }
                });
            }
        }

        draggedField = null;
        dragOverField = null;
    }

    function handleDragEnd() {
        draggedField = null;
        dragOverField = null;
    }
</script>

{#snippet draggableFieldRow(field: DisplayField)}
    <div
        class="field-row draggable"
        class:drag-over={dragOverField === field.key}
        class:dynamic-field={field.kind === 'dynamic'}
        draggable="true"
        role="option"
        aria-selected={field.pinned}
        tabindex="0"
        ondragstart={() => handleDragStart(field.key)}
        ondragover={(e) => handleDragOver(e, field.key)}
        ondragleave={handleDragLeave}
        ondrop={() => handleDrop(field.key)}
        ondragend={handleDragEnd}
    >
        <span class="drag-handle">⋮⋮</span>
        <label class="field-checkbox-label">
            <input
                type="checkbox"
                checked={field.pinned}
                onchange={() => toggleFieldPinned(field.key)}
            />
            <span>{field.label}</span>
        </label>
    </div>
{/snippet}

{#snippet fieldRow(field: DisplayField)}
    <div class="field-row" class:dynamic-field={field.kind === 'dynamic'}>
        <label class="field-checkbox-label">
            <input
                type="checkbox"
                checked={field.pinned}
                onchange={() => toggleFieldPinned(field.key)}
            />
            <span>{field.label}</span>
        </label>
    </div>
{/snippet}

<div class="field-section">
    <div class="field-section-header">
        <div class="field-section-title">{title}</div>
        <input 
            type="text" 
            class="search-input" 
            placeholder="Search fields..."
            bind:value={searchQuery}
        />
    </div>

    <div class="fields-container">
        <div class="fields-column">
            <!-- Pinned fields (draggable) -->
            {#if filteredSortedPinnedFields.length > 0}
        <div class="field-subsection-title">Pinned (drag to reorder)</div>
        <div class="field-list pinned-list">
            {#each sortedPinnedFields as field (field.key)}
                {@render draggableFieldRow(field)}
            {/each}
        </div>
    {/if}

    <!-- Unpinned fields -->
    {#if filteredUnpinnedFields.length > 0}
        <div class="field-subsection-title">Available</div>
        <div class="field-list">
            {#each filteredUnpinnedFields as field (field.key)}
                {@render fieldRow(field)}
            {/each}
        </div>
    {/if}
        </div>

        <div class="fields-column">
            <!-- Dynamic Fields (from JSON) -->
            {#each dynamicParentFields as parentField (parentField.key)}
                {@const dynamicFields = (unpinnedDynamicFieldsByParent.get(parentField.key) || []).filter(matchesSearch)}
                {@const pinnedForParentAll = filteredPinnedDynamicFields.filter(f => f.kind === 'dynamic' && f.parentKey === parentField.key)}
                {#if dynamicFields.length > 0 || pinnedForParentAll.length > 0}
                    <div class="field-subsection-title dynamic-section">
                        <span class="dynamic-icon">◈</span> {parentField.label} Fields
                    </div>
                    <!-- Pinned dynamic fields for this parent -->
                    {#if pinnedForParentAll.length > 0}
                <div class="field-list pinned-list dynamic-list">
                    {#each pinnedForParentAll as field (field.key)}
                        {@render draggableFieldRow(field)}
                    {/each}
                </div>
            {/if}
            <!-- Unpinned dynamic fields for this parent -->
            {#if dynamicFields.length > 0}
                <div class="field-list dynamic-list">
                    {#each dynamicFields as field (field.key)}
                        {@render fieldRow(field)}
                    {/each}
                </div>
            {/if}
                {/if}
            {/each}
        </div>
    </div>
</div>

<style>
    .field-section {
        margin-bottom: var(--spacing-sm);
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 200px);
        overflow: hidden;
    }

    .field-section:last-of-type {
        margin-bottom: var(--spacing-md);
    }

    .field-section-header {
        flex-shrink: 0;
        margin-bottom: var(--spacing-xs);
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

    .search-input {
        width: 100%;
        padding: var(--spacing-xs);
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border-medium);
        border-radius: var(--border-radius-sm);
        color: var(--color-text-primary);
        font-size: var(--font-size-xs);
        font-family: var(--font-mono);
        transition: border-color 0.2s;
    }

    .search-input:focus {
        outline: none;
        border-color: var(--color-accent-primary);
        background: var(--color-bg-secondary);
    }

    .search-input::placeholder {
        color: var(--color-text-tertiary);
    }

    .fields-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-sm);
        overflow-y: auto;
        flex: 1;
        padding-right: var(--spacing-xs);
    }

    .fields-column {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
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
