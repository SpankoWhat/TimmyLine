<script lang="ts">
    import type { DisplayField } from '$lib/config/displayFieldsConfig';
    import type { TimelineItem } from '$lib/stores/cacheStore';
    import { discoverDynamicFields, mergeFieldConfigs, saveFieldPreferences, clearFieldPreferences } from '$lib/utils/fieldUtils';
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
    // Also removes dynamic fields that are no longer discovered (e.g., after switching incidents)
    $effect(() => {
        const existingDynamic = fields.filter(f => f.kind === 'dynamic');

        const mergedFields = mergeFieldConfigs(
            displayFieldsConfig[type],
            discoveredDynamicFields,
            existingDynamic
        );

        // Build set of currently valid dynamic field keys
        const validDynamicKeys = new Set(
            mergedFields.filter(f => f.kind === 'dynamic').map(f => f.key)
        );

        // Remove stale dynamic fields that are no longer discovered
        const withoutStale = fields.filter(f => f.kind !== 'dynamic' || validDynamicKeys.has(f.key));

        // Find new fields to add
        const currentKeys = new Set(withoutStale.map(f => f.key));
        const newFields = mergedFields.filter(f => !currentKeys.has(f.key));

        // Only update if there are actual changes (avoids infinite reactivity loops)
        const staleRemoved = withoutStale.length !== fields.length;
        if (newFields.length > 0 || staleRemoved) {
            fields = [...withoutStale, ...newFields];
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
        fields = fields.map(f => {
            if (f.key !== fieldKey) return f;
            if (f.pinned) {
                const maxOrder = Math.max(...fields.map(x => x.order));
                return { ...f, pinned: false, order: maxOrder + 1 };
            } else {
                const pinnedFields = fields.filter(x => x.pinned);
                const maxPinnedOrder = pinnedFields.length > 0
                    ? Math.max(...pinnedFields.map(x => x.order))
                    : 0;
                return { ...f, pinned: true, order: maxPinnedOrder + 1 };
            }
        });
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

                // Build new order map from reordered pinned list
                const orderMap = new Map(pinnedFields.map((f, i) => [f.key, i + 1]));
                fields = fields.map(f => orderMap.has(f.key) ? { ...f, order: orderMap.get(f.key)! } : f);
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
        margin-bottom: var(--space-2);
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 200px);
        overflow: hidden;
    }

    .field-section:last-of-type {
        margin-bottom: var(--space-3);
    }

    .field-section-header {
        flex-shrink: 0;
        margin-bottom: var(--space-1);
    }

    .field-section-title {
        font-size: var(--text-xs);
        font-weight: var(--font-semibold);
        color: hsl(var(--brand-default));
        text-transform: uppercase;
        letter-spacing: var(--tracking-wide);
        margin-bottom: var(--space-1);
        padding-bottom: var(--space-1);
        border-bottom: var(--border-width) solid hsl(var(--border-muted));
    }

    .search-input {
        width: 100%;
        padding: var(--space-1);
        background: hsl(var(--bg-surface-200));
        border: var(--border-width) solid hsl(var(--border-default));
        border-radius: var(--radius-sm);
        color: hsl(var(--fg-default));
        font-size: var(--text-xs);
        font-family: var(--font-mono);
        transition: var(--transition-colors);
    }

    .search-input:focus {
        outline: none;
        border-color: hsl(var(--brand-default));
        background: hsl(var(--bg-surface-100));
    }

    .search-input::placeholder {
        color: hsl(var(--fg-lighter));
    }

    .search-input:focus-visible,
    .field-checkbox-label input:focus-visible {
        outline: var(--border-width-thick) solid hsl(var(--border-focus));
        outline-offset: 1px;
    }

    .fields-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);
        overflow-y: auto;
        flex: 1;
        padding-right: var(--space-1);
    }

    .fields-column {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .field-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .field-list.pinned-list {
        background: hsl(var(--bg-surface-200));
        border-radius: var(--radius-sm);
        padding: var(--space-1);
    }

    .field-subsection-title {
        font-size: var(--text-2xs);
        color: hsl(var(--fg-lighter));
        text-transform: uppercase;
        letter-spacing: var(--tracking-wide);
        margin-top: var(--space-1);
        margin-bottom: var(--space-0\.5);
    }

    .field-row {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        justify-content: flex-start;
    }

    .field-row.draggable {
        cursor: grab;
        border: var(--border-width) solid transparent;
        border-radius: var(--radius-sm);
        padding: var(--space-0\.5);
        margin: calc(-1 * var(--space-0\.5));
        transition: var(--transition-colors);
    }

    .field-row.draggable:hover {
        background: hsl(var(--bg-surface-200));
        border-color: hsl(var(--border-default));
    }

    .field-row.draggable:active {
        cursor: grabbing;
    }

    .field-row.drag-over {
        border-color: hsl(var(--brand-default));
        background: hsl(var(--brand-default) / 0.1);
    }

    .drag-handle {
        color: hsl(var(--fg-lighter));
        font-size: var(--text-2xs);
        user-select: none;
        cursor: grab;
        padding: 0 var(--space-0\.5);
    }

    .field-row.draggable:hover .drag-handle {
        color: hsl(var(--brand-default));
    }

    .field-checkbox-label {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        cursor: pointer;
        font-size: var(--text-xs);
        color: hsl(var(--fg-default));
        user-select: none;
        transition: var(--transition-colors);
        padding: var(--space-1) var(--space-0\.5);
        border-radius: var(--radius-sm);
        flex: 1;
    }

    .field-checkbox-label:hover {
        background: hsl(var(--bg-surface-200));
    }

    .field-checkbox-label input[type="checkbox"] {
        cursor: pointer;
        accent-color: hsl(var(--brand-default));
    }

    /* Dynamic field styles */
    .dynamic-section {
        color: hsl(var(--warning-default));
        display: flex;
        align-items: center;
        gap: var(--space-1);
    }

    .dynamic-icon {
        font-size: 8px;
    }

    .dynamic-list {
        border-left: var(--border-width-thick) solid hsl(var(--warning-default));
        margin-left: var(--space-1);
        padding-left: var(--space-1);
    }

    .dynamic-field .field-checkbox-label {
        color: hsl(var(--fg-light));
    }

    .dynamic-field .field-checkbox-label:hover {
        color: hsl(var(--fg-default));
    }

    .dynamic-field input[type="checkbox"] {
        accent-color: hsl(var(--warning-default));
    }
</style>
