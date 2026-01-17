# Dynamic JSON Field Rendering System

## Overview

The dynamic field rendering system allows TimmyLine to automatically discover and display individual properties from JSON fields as separate, user-customizable fields in the timeline interface. This enables users to pin, reorder, and control visibility of specific JSON properties without losing the raw JSON data.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dynamic Field Flow                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. JSON Data (Database) → 2. Field Discovery → 3. User Config │
│ 4. Field Rendering → 5. User Interaction → 6. State Management│
└─────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/lib/
├── config/
│   └── displayFieldsConfig.ts      # Field configuration & flags
├── utils/
│   └── dynamicFields.ts            # Core JSON parsing logic
├── components/
│   └── TimelineRow.svelte          # Field rendering & display
├── modals/
│   └── types.ts                    # Type definitions
└── routes/incident/[incident]/
    └── +page.svelte                # State management & UI
```

## Data Flow

### 1. Configuration Phase

**File: `src/lib/config/displayFieldsConfig.ts`**

Static field configurations define which fields support dynamic rendering:

```typescript
{ 
  key: 'event_data', 
  label: 'Event Data', 
  allowDynamicFieldRendering: true  // ← Enables JSON parsing
}
```

**Key Properties:**
- `allowDynamicFieldRendering: boolean` - Enables JSON parsing for this field
- `isDynamic: boolean` - Marks dynamically generated sub-fields
- `parentKey: string` - References the parent JSON field (e.g., 'event_data')

### 2. Data Discovery Phase

**File: `src/lib/utils/dynamicFields.ts`**

When timeline data loads, the system scans for JSON content:

```typescript
// Input: Timeline items from $combinedTimeline store
const timeline = [
  {
    type: 'event',
    data: {
      event_data: '{"source_ip": "192.168.1.1", "ports": [22, 443]}'
    }
  }
]

// Process: JSON parsing and field discovery
discoverDynamicFields(timeline, displayFieldsConfig, 'event')

// Output: Virtual DisplayField objects
[
  { 
    key: 'event_data.source_ip', 
    label: 'Source Ip', 
    isDynamic: true, 
    parentKey: 'event_data' 
  },
  { 
    key: 'event_data.ports', 
    label: 'Ports', 
    isDynamic: true, 
    parentKey: 'event_data' 
  }
]
```

**Discovery Process:**
1. Filter timeline items by type (event/action)
2. Find fields marked with `allowDynamicFieldRendering: true`
3. Parse JSON strings using `safeJsonParse()`
4. Generate virtual `DisplayField` objects for each JSON property
5. Convert property names to human-readable labels (`source_ip` → `Source Ip`)

### 3. State Management Phase

**File: `src/routes/incident/[incident]/+page.svelte`**

The incident page manages the complete field state lifecycle:

```typescript
// Reactive field discovery
const discoveredDynamicFields = $derived({
  event: discoverDynamicFields($combinedTimeline, displayFieldsConfig, 'event'),
  action: discoverDynamicFields($combinedTimeline, displayFieldsConfig, 'action')
});

// Merge with user state
$effect(() => {
  const mergedEventFields = mergeFieldConfigs(
    displayFieldsConfig.event,
    discoveredDynamicFields.event,
    existingEventDynamic  // Preserve user pin/order preferences
  );
  
  fieldStates.event = [...fieldStates.event, ...newEventKeys];
});
```

**State Organization:**
- `fieldStates` - Master state containing all fields (static + dynamic)
- `sortedPinnedFields` - Static pinned fields (excludes dynamic for separate UI section)
- `pinnedDynamicFields` - Dynamic fields that user has pinned
- `unpinnedDynamicFieldsByParent` - Unpinned dynamic fields grouped by parent field

### 4. User Interface Phase

**File: `src/routes/incident/[incident]/+page.svelte`**

The field selector UI displays dynamic fields in dedicated sections:

```svelte
<!-- Dynamic Fields (from JSON) -->
{#each dynamicParentFields.event as parentField (parentField.key)}
  {@const dynamicFields = unpinnedDynamicFieldsByParent.event.get(parentField.key) || []}
  {#if dynamicFields.length > 0}
    <div class="field-subsection-title dynamic-section">
      <span class="dynamic-icon">◈</span> {parentField.label} Fields
    </div>
    <!-- Pinned and unpinned dynamic fields for this parent -->
  {/if}
{/each}
```

**UI Features:**
- Dynamic fields grouped by parent JSON field
- Visual distinction with amber styling and `◈` icon
- Drag-and-drop reordering for pinned dynamic fields
- Independent pin/unpin controls for each JSON property

### 5. Rendering Phase

**File: `src/lib/components/TimelineRow.svelte`**

Timeline rows use the field value utility to render dynamic content:

```typescript
// Helper function using dot notation access
function getDisplayValue(field: DisplayField): string {
  return getFieldValue(item.data as Record<string, unknown>, field);
}
```

```svelte
<!-- Field rendering with dynamic support -->
<span class="field-prefix">{field.isDynamic ? '◈' : '│'}</span>
<span class="datafield title">{field.label?.toUpperCase() || '-'}</span>
<span class="datafield value">{getDisplayValue(field)}</span>
```

**Value Resolution:**
- **Dynamic fields**: Parse parent JSON → extract sub-property → format for display
- **Regular fields**: Direct property access from item.data
- **JSON parent fields**: Display summary (`{3 fields}`) instead of raw JSON

## Key Algorithms

### JSON Property Discovery

**Function: `discoverDynamicFields()`**

```typescript
1. Initialize tracking: Map<parentKey, Set<discoveredSubKeys>>
2. For each timeline item:
   a. For each allowDynamicFieldRendering field:
      - Parse JSON string safely
      - Extract all object keys
      - Create virtual DisplayField for new keys
      - Track in seenKeys to avoid duplicates
3. Return Map<parentKey, DisplayField[]>
```

### Field Value Resolution

**Function: `getFieldValue()`**

```typescript
1. Check if field.isDynamic:
   - YES: Parse parent JSON → extract sub-key → format value
   - NO: Direct access to item.data[field.key]
2. Handle different value types:
   - Arrays: Join with commas
   - Objects: JSON.stringify()
   - Primitives: String conversion
   - null/undefined: Return '—'
```

### State Merging

**Function: `mergeFieldConfigs()`**

```typescript
1. Start with static field configuration
2. For each static field with allowDynamicFieldRendering:
   a. Add the static field to result
   b. Find discovered dynamic sub-fields for this parent
   c. Preserve existing user state (pinned/order preferences)
   d. Add dynamic sub-fields after parent in result array
3. Return combined DisplayField[]
```

## User Workflows

### Discovering New Fields

1. **Data Entry**: User adds timeline event with JSON in `event_data`:
   ```json
   {"threat_level": "high", "ioc_count": 15, "source": "SIEM"}
   ```

2. **Auto-Discovery**: System parses JSON and creates virtual fields:
   - `event_data.threat_level` → "Threat Level"
   - `event_data.ioc_count` → "Ioc Count" 
   - `event_data.source` → "Source"

3. **Field Selector**: New fields appear under "Event Data Fields" section

4. **User Control**: User can pin specific fields (e.g., pin "Threat Level" to main row)

### Field Customization

1. **Pinning**: Click checkbox to pin field → moves to main timeline row
2. **Unpinning**: Uncheck to move back to available fields
3. **Reordering**: Drag pinned fields to change display order
4. **Reset**: "Reset to Default" unpins all dynamic fields, preserves discovery

### Field Display

1. **Main Row**: Pinned fields show with `◈` prefix (amber styling)
2. **Note Section**: Fields marked with `showInNote: true`
3. **Raw Field**: Parent JSON field shows `{N fields}` summary when sub-fields are available

## Error Handling

### JSON Parsing Safety

```typescript
function safeJsonParse(jsonString: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(jsonString);
    // Only accept objects (not arrays or primitives)
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) 
      ? parsed 
      : null;
  } catch {
    return null; // Invalid JSON fails silently
  }
}
```

### Type Safety

- All field access uses optional chaining: `item.data?.[field.key]`
- Unknown values default to `'—'` placeholder
- Dynamic field detection gracefully handles missing/malformed data

### State Consistency

- User preferences preserved across data refreshes
- Dynamic fields regenerated when new JSON properties discovered
- Field order maintained even when timeline data changes

## Performance Considerations

### Caching Strategy

- **Field Discovery**: Runs only when `$combinedTimeline` changes
- **JSON Parsing**: Cached at discovery phase, not re-parsed during rendering
- **User State**: Preserved in `fieldStates` to avoid re-computation

### Optimization Opportunities

1. **Memoization**: Cache parsed JSON objects per timeline item
2. **Incremental Updates**: Only re-discover fields when new items added
3. **Schema Hints**: Pre-define expected JSON structures for faster processing

## Testing & Debugging

### Debug Workflow

1. **Console Logging**: Add logs to `discoverDynamicFields()` to see discovery process
2. **Field State**: Inspect `fieldStates` reactive variable in browser dev tools
3. **JSON Validation**: Test with malformed JSON to verify error handling
4. **User Preferences**: Verify state persistence after timeline data changes

### Test Cases

```typescript
// Test data examples
const testEventData = {
  valid_json: '{"key1": "value1", "key2": [1,2,3]}',
  invalid_json: '{malformed json',
  empty_json: '{}',
  non_object: '"primitive_string"',
  nested_object: '{"level1": {"level2": "value"}}'
};
```

## Extensibility

### Adding New Features

1. **Nested Object Support**: Extend `getNestedValue()` for deeper object traversal
2. **Field Type Hints**: Add type detection for better formatting (dates, URLs, etc.)
3. **Custom Parsers**: Support non-JSON structured data (XML, CSV, etc.)
4. **Field Validation**: Add validation rules for discovered dynamic fields

### Schema Evolution

The system gracefully handles evolving JSON schemas:
- New properties automatically discovered
- Missing properties display as `'—'`
- Schema changes don't break existing user configurations

---

## Quick Reference

### Key Functions
- `discoverDynamicFields()` - Main discovery engine
- `getFieldValue()` - Field value resolution
- `mergeFieldConfigs()` - State merging
- `formatDynamicValue()` - Display formatting

### Key State Variables
- `fieldStates` - Complete field configuration
- `discoveredDynamicFields` - Auto-discovered JSON fields  
- `filteredDisplayFieldsConfig` - Final merged configuration for rendering

### Visual Indicators
- `◈` - Dynamic field prefix
- Amber styling - Dynamic field highlighting
- `{N fields}` - JSON summary display

This system provides a seamless bridge between structured JSON data and user-customizable field displays, maintaining both data integrity and user control.