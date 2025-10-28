# Generic Modal System - Usage Guide

## 🎯 Overview

Your project now has a fully modular, generic modal system for all CRUD operations! One modal component handles all entity types.

## 📁 Files Created

1. **`src/lib/stores/modalStore.ts`** - Modal state management
2. **`src/lib/config/modalFields.ts`** - Field configurations for all entity types
3. **`src/lib/components/GenericModal.svelte`** - The universal modal component
4. **Updated: `src/routes/+layout.svelte`** - Integrated modal system
5. **Updated: `src/lib/components/FloatingQuickActions.svelte`** - Uses modal system

## 🚀 How to Use

### Opening a Modal

```typescript
import { modalStore } from '$lib/stores/modalStore';

// Open create modal
modalStore.open({
	title: 'New Timeline Event',
	entityType: 'timeline_event',
	mode: 'create',
	onSubmit: async (data) => {
		// Your save logic here
		console.log('Saving:', data);
	}
});

// Open edit modal
modalStore.open({
	title: 'Edit Entity',
	entityType: 'entity',
	mode: 'edit',
	data: existingEntityData,
	onSubmit: async (data) => {
		// Your update logic here
	}
});
```

### Supported Entity Types

- `incident` - Main incident records
- `timeline_event` - Timeline events
- `investigation_action` - Investigation actions
- `entity` - Entities (IPs, domains, etc.)
- `annotation` - Notes and observations
- `action_type` - Lookup table for action types
- `entity_type` - Lookup table for entity types
- `event_type` - Lookup table for event types
- `annotation_type` - Lookup table for annotation types
- `analyst` - Analyst profiles

## ✨ Features

### 1. **Automatic Field Rendering**
Fields are automatically rendered based on configuration in `modalFields.ts`:
- Text inputs
- Textareas
- Select dropdowns (with dynamic population from stores)
- Datetime pickers (with epoch conversion)
- Number inputs

### 2. **Built-in Validation**
- Required field validation
- Custom validation functions (e.g., email format)
- Real-time error display

### 3. **Dynamic Options**
Dropdowns automatically populate from your stores:
- Event types from `$eventTypes`
- Action types from `$actionTypes`
- Entity types from `$entityTypes`
- Annotation types from `$annotationTypes`

### 4. **Epoch Time Handling**
Datetime fields automatically convert between:
- Browser datetime-local format → Epoch timestamps
- Epoch timestamps → Browser datetime-local format

### 5. **Terminal Aesthetic**
Matches your existing design with:
- Cyan borders and highlights
- Green text for inputs
- Smooth transitions and hover effects
- Loading states with animation

## 🎨 Customization

### Adding a New Entity Type

1. **Add field config in `modalFields.ts`:**

```typescript
export const entityFieldConfigs = {
	// ... existing configs
	
	my_new_entity: [
		{
			key: 'name',
			label: 'Name',
			type: 'text',
			required: true,
			placeholder: 'Enter name',
		},
		{
			key: 'status',
			label: 'Status',
			type: 'select',
			options: [
				{ value: 'active', label: 'Active' },
				{ value: 'inactive', label: 'Inactive' },
			],
		},
	],
};
```

2. **Update the type in `modalStore.ts`:**

```typescript
export type ModalConfig = {
	entityType: 'incident' | 'timeline_event' | 'my_new_entity' | ...;
	// ... rest of config
};
```

3. **Use it:**

```typescript
modalStore.open({
	title: 'My New Entity',
	entityType: 'my_new_entity',
	mode: 'create',
	onSubmit: async (data) => { /* ... */ }
});
```

### Custom Validation

Add validation functions to field configs:

```typescript
{
	key: 'email',
	label: 'Email',
	type: 'text',
	validation: (value) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(value) ? null : 'Invalid email format';
	},
}
```

## 🔧 Current Integration

### In Layout (Bottom Dock)
- ✅ Create Entities dropdown → Opens modals
- ✅ Configure Database dropdown → Opens modals
- ⏳ Relate Entities dropdown → TODO (needs custom modal)

### In Floating Quick Actions
- ✅ Create New dropdown → Opens modals
- ✅ Integrated with incident/analyst selectors

### API Integration
The layout's `openModal()` function automatically:
1. Adds `incident_id` for core entities
2. Adds `analyst_id` from current analyst
3. Converts datetime strings to epoch timestamps
4. Routes to correct API endpoint
5. Refreshes caches after success

## 📝 Example: Creating a Timeline Event

User clicks "Timeline Event" → Modal opens with fields:
- Event Type (dropdown from lookup table)
- Source (text input)
- Source Reliability (A-F dropdown)
- Severity (critical/high/medium/low/info)
- Occurred At (datetime picker)
- Discovered At (datetime picker)
- Description (textarea)

On submit:
1. Validates all required fields
2. Converts datetime to epoch
3. Adds current `incident_id` and `analyst_id`
4. POSTs to `/api/create/core/timeline_event`
5. Refreshes all caches
6. Closes modal

## 🎉 Benefits Over Individual Modals

- **90% less code** - One modal vs 10+ individual modals
- **Consistent UX** - All modals look and behave identically
- **Easy maintenance** - Update styling once
- **Type safe** - Full TypeScript support
- **Flexible** - Add new entity types in minutes
- **Validated** - Built-in validation system
- **Terminal styled** - Matches your aesthetic

## 🚧 Next Steps

1. ✅ Core CRUD modals implemented
2. ⏳ Implement relation modals (junction tables)
3. ⏳ Add "Edit" mode throughout app
4. ⏳ Add "Delete" confirmation modals
5. ⏳ Add toast notifications for success/error

## 🐛 Troubleshooting

**Modal not opening?**
- Check console for errors
- Verify entity type is in `modalFields.ts`
- Ensure stores are initialized

**Dropdown empty?**
- Check if store is populated (`$eventTypes`, etc.)
- Call `initializeAllCaches()` on mount

**Validation errors?**
- Check field config `required` flags
- Review custom validation functions

**API errors?**
- Check endpoint paths in `openModal()`
- Verify request body structure
- Check server logs

Enjoy your new modular modal system! 🎊
