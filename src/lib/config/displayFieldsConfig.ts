// Field configuration for timeline events and investigation actions
// Defines display labels, default pinned state, and note display behavior
// Users can toggle field visibility and pinned state in the UI

export interface DisplayField {
	key: string;
	label: string;
	pinned: boolean; // Default pinned state - users can change this
	showInNote: boolean; // Developer-controlled: appears in secondary-row notes
	order: number; // Display order for pinned fields (lower = leftmost)
	hideFromUser?: boolean; // If true, user cannot toggle visibility for this field
	allowDynamicFieldRendering?: boolean; // If true, JSON content will be parsed into sub-fields
	parentKey?: string; // For dynamic sub-fields: the key of the parent JSON field
	isDynamic?: boolean; // True if this field was dynamically generated from JSON
}

export interface DisplayFieldsConfiguration {
	event: DisplayField[];
	action: DisplayField[];
}

// Type for fields that can be expanded (static + dynamic combined)
export type ExpandedDisplayField = DisplayField & {
	dynamicSubFields?: DisplayField[];
};

export const displayFieldsConfig: DisplayFieldsConfiguration = {
	event: [
        // Primary display fields (pinned by default)
		{ key: 'event_type', label: 'Event Type', pinned: true, showInNote: false, order: 1 },
		{ key: 'severity', label: 'Severity', pinned: true, showInNote: false, order: 2 },
		{ key: 'source', label: 'Source', pinned: true, showInNote: false, order: 3 },
		{ key: 'source_reliability', label: 'Reliability', pinned: true, showInNote: false, order: 4 },

		// Secondary fields (hidden from user, shown in notes) - supports dynamic JSON expansion
		{ key: 'event_data', label: 'Event Data', pinned: false, showInNote: true, order: 100, hideFromUser: false, allowDynamicFieldRendering: true },

		// Additional fields (unpinned)
		{ key: 'confidence', label: 'Confidence', pinned: false, showInNote: false, order: 101 },
		{ key: 'occurred_at', label: 'Occurred At', pinned: false, showInNote: false, order: 102 },
		{ key: 'discovered_at', label: 'Discovered At', pinned: false, showInNote: false, order: 103 },
		{ key: 'tags', label: 'Tags', pinned: false, showInNote: false, order: 104 },
	],
	action: [
		// Primary display fields (pinned)
		{ key: 'action_type', label: 'Action Type', pinned: true, showInNote: false, order: 1 },
		{ key: 'result', label: 'Result', pinned: true, showInNote: false, order: 2 },
		{ key: 'tool_used', label: 'Tool', pinned: true, showInNote: false, order: 3 },

		// Secondary fields (hidden from user, shown in notes) - supports dynamic JSON expansion
		{ key: 'notes', label: 'Notes', pinned: false, showInNote: true, order: 100, hideFromUser: true },

		// Additional fields (unpinned)
		{ key: 'outcome', label: 'Outcome', pinned: false, showInNote: false, order: 101 },
		{ key: 'next_steps', label: 'Next Steps', pinned: false, showInNote: false, order: 102 },
		{ key: 'performed_at', label: 'Performed At', pinned: false, showInNote: false, order: 103 },
		{ key: 'action_data', label: 'Action Data', pinned: false, showInNote: false, order: 104, allowDynamicFieldRendering: true },
		{ key: 'tags', label: 'Tags', pinned: false, showInNote: false, order: 105 },
	],
};
