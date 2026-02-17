// Field configuration for timeline events and investigation actions
// Defines display labels, default pinned state, and note display behavior
// Users can toggle field visibility and pinned state in the UI

/** Base properties shared by all field kinds */
interface DisplayFieldBase {
	key: string;
	label: string;
	pinned: boolean;
	order: number;
}

/** Standard user-toggleable field */
export interface StandardField extends DisplayFieldBase {
	kind: 'standard';
}

/** System field hidden from user UI, shown in a fixed slot (notes row, or JSON parent) */
export interface SystemField extends DisplayFieldBase {
	kind: 'system';
	showInNote: boolean;
	/** If true, JSON content will be parsed into dynamic sub-fields */
	allowDynamicFieldRendering?: boolean;
}

/** Dynamic field discovered at runtime from JSON blob */
export interface DynamicField extends DisplayFieldBase {
	kind: 'dynamic';
	parentKey: string;
}

export type DisplayField = StandardField | SystemField | DynamicField;

export interface DisplayFieldsConfiguration {
	event: DisplayField[];
	action: DisplayField[];
}

export const displayFieldsConfig: DisplayFieldsConfiguration = {
	event: [
		// Primary display fields (pinned by default)
		{ key: 'event_type', label: 'Event Type', pinned: true, order: 1, kind: 'standard' },
		{ key: 'severity', label: 'Severity', pinned: true, order: 2, kind: 'standard' },
		{ key: 'source', label: 'Source', pinned: true, order: 3, kind: 'standard' },
		{ key: 'source_reliability', label: 'Reliability', pinned: true, order: 4, kind: 'standard' },

		// System fields (hidden from user toggle UI)
		{ key: 'notes', label: 'Notes', pinned: false, order: 100, kind: 'system', showInNote: true },
		{ key: 'event_data', label: 'Event Data', pinned: false, order: 105, kind: 'system', showInNote: false, allowDynamicFieldRendering: true },

		// Additional fields (unpinned)
		{ key: 'confidence', label: 'Confidence', pinned: false, order: 101, kind: 'standard' },
		{ key: 'occurred_at', label: 'Occurred At', pinned: false, order: 102, kind: 'standard' },
		{ key: 'discovered_at', label: 'Discovered At', pinned: false, order: 103, kind: 'standard' },
		{ key: 'tags', label: 'Tags', pinned: false, order: 104, kind: 'standard' },
	],
	action: [
		// Primary display fields (pinned)
		{ key: 'action_type', label: 'Action Type', pinned: true, order: 1, kind: 'standard' },
		{ key: 'result', label: 'Result', pinned: true, order: 2, kind: 'standard' },
		{ key: 'tool_used', label: 'Tool', pinned: true, order: 3, kind: 'standard' },

		// System fields (hidden from user toggle UI)
		{ key: 'notes', label: 'Notes', pinned: false, order: 100, kind: 'system', showInNote: true },
		{ key: 'action_data', label: 'Action Data', pinned: false, order: 104, kind: 'system', showInNote: false, allowDynamicFieldRendering: true },

		// Additional fields (unpinned)
		{ key: 'outcome', label: 'Outcome', pinned: false, order: 101, kind: 'standard' },
		{ key: 'next_steps', label: 'Next Steps', pinned: false, order: 102, kind: 'standard' },
		{ key: 'performed_at', label: 'Performed At', pinned: false, order: 103, kind: 'standard' },
		{ key: 'tags', label: 'Tags', pinned: false, order: 105, kind: 'standard' },
	],
};
