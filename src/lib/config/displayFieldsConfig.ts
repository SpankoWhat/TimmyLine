// Field configuration for timeline events and investigation actions
// Defines display labels, default pinned state, and note display behavior
// Users can toggle field visibility and pinned state in the UI

export interface DisplayField {
	key: string;
	label: string;
	pinned: boolean; // Default pinned state - users can change this
	showInNote: boolean; // Developer-controlled: appears in secondary-row notes
    hideFromUser?: boolean; // If true, user cannot toggle visibility for this field
}

export interface DisplayFieldsConfiguration {
	event: DisplayField[];
	action: DisplayField[];
}

export const displayFieldsConfig: DisplayFieldsConfiguration = {
	event: [
        // Primary display fields (pinned by default)
		{ key: 'event_type', label: 'Event Type', pinned: true, showInNote: false },
		{ key: 'severity', label: 'Severity', pinned: true, showInNote: false },
		{ key: 'source', label: 'Source', pinned: true, showInNote: false },
		{ key: 'source_reliability', label: 'Reliability', pinned: true, showInNote: false },

        // Secondary fields (hidden from user, shown in notes)
        { key: 'event_data', label: 'Notes', pinned: false, showInNote: true, hideFromUser: true },

		// Additional fields (unpinned)
		{ key: 'confidence', label: 'Confidence', pinned: false, showInNote: false },
		{ key: 'occurred_at', label: 'Occurred At', pinned: false, showInNote: false },
		{ key: 'discovered_at', label: 'Discovered At', pinned: false, showInNote: false },
		{ key: 'tags', label: 'Tags', pinned: false, showInNote: false },
	],
	action: [
		// Primary display fields (pinned)
		{ key: 'action_type', label: 'Action Type', pinned: true, showInNote: false },
		{ key: 'result', label: 'Result', pinned: true, showInNote: false },
		{ key: 'tool_used', label: 'Tool', pinned: true, showInNote: false },

        // Secondary fields (hidden from user, shown in notes)
        { key: 'notes', label: 'Notes', pinned: false, showInNote: true, hideFromUser: true },

		// Additional fields (unpinned)
		{ key: 'outcome', label: 'Outcome', pinned: false, showInNote: false },
		{ key: 'next_steps', label: 'Next Steps', pinned: false, showInNote: false },
		{ key: 'performed_at', label: 'Performed At', pinned: false, showInNote: false },
		{ key: 'action_data', label: 'Action Data', pinned: false, showInNote: false },
		{ key: 'tags', label: 'Tags', pinned: false, showInNote: false },
	],
};
