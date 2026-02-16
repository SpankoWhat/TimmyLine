/**
 * Configuration file that holds types and field values for the various modal forms.
 * Dynamic values are now handeled in the each modal handler's getEnrichedFields method.
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox' | 'json';

export type FieldConfig = {
	key: string;
	label: string;
	type: FieldType;
	required?: boolean;
	placeholder?: string;
	options?: { value: string; label: string }[]; // For select/multiselect
	validation?: (value: any) => string | null; // Returns error message or null
	defaultValue?: any;
	helpText?: string;
};

// Shared option arrays used across multiple field configs
export const SEVERITY_OPTIONS: FieldConfig['options'] = [
	{ value: 'critical', label: 'Critical' },
	{ value: 'high', label: 'High' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'low', label: 'Low' },
	{ value: 'info', label: 'Info' },
];

export const CONFIDENCE_OPTIONS: FieldConfig['options'] = [
	{ value: 'high', label: 'High' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'low', label: 'Low' },
	{ value: 'guess', label: 'Guess' },
];

export const PRIORITY_OPTIONS: FieldConfig['options'] = [
	{ value: 'critical', label: 'Critical' },
	{ value: 'high', label: 'High' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'low', label: 'Low' },
];

export const entityFieldConfigs: Record<string, FieldConfig[]> = {
	// Core Tables
	incident: [
		{
			key: 'title',
			label: 'Incident Title',
			type: 'text',
			required: true,
			placeholder: 'Brief description of the incident',
			helpText: 'Max 500 characters',
		},
		{
			key: 'soar_ticket_id',
			label: 'SOAR Ticket ID',
			type: 'text',
			placeholder: 'Optional SOAR ticket reference',
			helpText: 'Max 10 characters, must be unique',
		},
		{
			key: 'priority',
			label: 'Priority',
			type: 'select',
			required: true,
			options: PRIORITY_OPTIONS,
			defaultValue: 'medium',
		},
		{
			key: 'status',
			label: 'Status',
			type: 'select',
			required: true,
			options: [
				{ value: 'In Progress', label: 'In Progress' },
				{ value: 'Post-Mortem', label: 'Post-Mortem' },
				{ value: 'Closed', label: 'Closed' },
			],
			defaultValue: 'In Progress',
		},
	],
	
	timeline_event: [
		{
			key: 'event_type',
			label: 'Event Type',
			type: 'select',
			required: true,
			options: [], // Populated dynamically from eventTypes store
			helpText: 'Max 50 characters',
		},
		{
			key: 'discovered_at',
			label: 'Discovered At',
			type: 'datetime',
			required: true,
			helpText: 'When the analyst discovered this event',
		},
		{
			key: 'occurred_at',
			label: 'Occurred At',
			type: 'datetime',
			required: false,
			helpText: 'When the event actually happened (may be unknown)',
		},
		{
			key: 'notes',
			label: 'Notes',
			type: 'textarea',
			placeholder: 'Additional context or observations about the event',
		},
		{
			key: 'event_data',
			label: 'Event Details',
			type: 'json',
			required: true,
			placeholder: '{"key": "value"}',
			helpText: 'Structured key-value data. Use builder mode or paste raw JSON.',
		},
		{
			key: 'severity',
			label: 'Severity',
			type: 'select',
			options: SEVERITY_OPTIONS,
		},
		{
			key: 'confidence',
			label: 'Confidence',
			type: 'select',
			options: CONFIDENCE_OPTIONS,
		},
		{
			key: 'source',
			label: 'Source',
			type: 'text',
			placeholder: 'e.g., Firewall, EDR, SIEM',
			helpText: 'Max 200 characters',
		},
		{
			key: 'source_reliability',
			label: 'Source Reliability',
			type: 'select',
			options: [
				{ value: 'A', label: 'A - Completely Reliable' },
				{ value: 'B', label: 'B - Usually Reliable' },
				{ value: 'C', label: 'C - Fairly Reliable' },
				{ value: 'D', label: 'D - Not Usually Reliable' },
				{ value: 'E', label: 'E - Unreliable' },
				{ value: 'F', label: 'F - Cannot Be Judged' },
			],
		},
		{
			key: 'tags',
			label: 'Tags',
			type: 'text',
			placeholder: 'Comma-separated tags',
		},
	],
	
	investigation_action: [
		{
			key: 'action_type',
			label: 'Action Type',
			type: 'select',
			required: true,
			options: [], // Populated from actionTypes store
			helpText: 'Max 50 characters',
		},
		{
			key: 'performed_at',
			label: 'Performed At',
			type: 'datetime',
			required: true,
		},
		{
			key: 'result',
			label: 'Result',
			type: 'select',
			options: [
				{ value: 'success', label: 'Success' },
				{ value: 'failed', label: 'Failed' },
				{ value: 'partial', label: 'Partial' },
				{ value: 'pending', label: 'Pending' },
			],
		},
		{
			key: 'tool_used',
			label: 'Tool Used',
			type: 'text',
			placeholder: 'e.g., Wireshark, Splunk, PowerShell',
			helpText: 'Max 100 characters',
		},
		{
			key: 'action_data',
			label: 'Action Details',
			type: 'json',
			placeholder: '{"key": "value"}',
			helpText: 'Structured key-value data. Use builder mode or paste raw JSON.',
		},
		{
			key: 'notes',
			label: 'Notes',
			type: 'textarea',
		},
		{
			key: 'next_steps',
			label: 'Next Steps',
			type: 'textarea',
		},
		{
			key: 'tags',
			label: 'Tags',
			type: 'text',
			placeholder: 'Comma-separated tags',
		},
	],
	
	entity: [
		{
			key: 'entity_type',
			label: 'Entity Type',
			type: 'select',
			required: true,
			options: [], // Populated from entityTypes store
			helpText: 'Max 50 characters',
		},
		{
			key: 'identifier',
			label: 'Identifier',
			type: 'text',
			required: true,
			placeholder: 'e.g., IP address, hostname, file hash',
			helpText: 'Max 500 characters - Must be unique per incident',
		},
		{
			key: 'display_name',
			label: 'Display Name',
			type: 'text',
			placeholder: 'Human-friendly name for the entity',
			helpText: 'Max 200 characters',
		},
		{
			key: 'status',
			label: 'Status',
			type: 'select',
			options: [
				{ value: 'active', label: 'Active' },
				{ value: 'inactive', label: 'Inactive' },
				{ value: 'unknown', label: 'Unknown' },
			],
		},
		{
			key: 'criticality',
			label: 'Criticality',
			type: 'select',
			options: [
				{ value: 'critical', label: 'Critical' },
				{ value: 'high', label: 'High' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'low', label: 'Low' },
				{ value: 'unknown', label: 'Unknown' },
			],
		},
		{
			key: 'first_seen',
			label: 'First Seen',
			type: 'datetime',
		},
		{
			key: 'last_seen',
			label: 'Last Seen',
			type: 'datetime',
		},
		{
			key: 'attributes',
			label: 'Attributes',
			type: 'textarea',
			placeholder: 'JSON format for flexible attributes',
		},
		{
			key: 'tags',
			label: 'Tags',
			type: 'text',
			placeholder: 'Comma-separated tags',
		},
	],
	
	annotation: [
		{
			key: 'annotation_type',
			label: 'Annotation Type',
			type: 'select',
			required: true,
			options: [], // Populated from annotationTypes store
			helpText: 'Max 50 characters',
		},
		{
			key: 'content',
			label: 'Content',
			type: 'textarea',
			required: true,
			placeholder: 'Add your note or observation',
		},
		{
			key: 'confidence',
			label: 'Confidence',
			type: 'select',
			options: CONFIDENCE_OPTIONS,
		},
		{
			key: 'is_hypothesis',
			label: 'Is Hypothesis',
			type: 'checkbox',
			defaultValue: false,
		},
		{
			key: 'refers_to',
			label: 'Refers To',
			type: 'text',
			placeholder: 'UUID of related entity (optional)',
			helpText: 'Link this annotation to a specific event, action, or entity',
		},
		{
			key: 'tags',
			label: 'Tags',
			type: 'text',
			placeholder: 'Comma-separated tags',
		},
	],

	analyst: [
		{
			key: 'username',
			label: 'Username',
			type: 'text',
			required: true,
			placeholder: 'Your username',
			helpText: 'Max 100 characters - Must be unique',
		},
		{
			key: 'full_name',
			label: 'Full Name',
			type: 'text',
			placeholder: 'John Doe',
			helpText: 'Max 100 characters',
		},
		{
			key: 'role',
			label: 'Role',
			type: 'select',
			options: [
				{ value: 'analyst', label: 'Analyst' },
				{ value: 'on-point lead', label: 'On-Point Lead' },
				{ value: 'observer', label: 'Observer' }
			],
			defaultValue: 'analyst',
		},
		{
			key: 'active',
			label: 'Active',
			type: 'checkbox',
			defaultValue: true,
			helpText: 'Uncheck to soft-delete analyst',
		},
	],

	// Lookup tables
	action_type: [
		{
			key: 'name',
			label: 'Action Type Name',
			type: 'text',
			required: true,
			placeholder: 'e.g., Analyze Logs, Block IP',
			helpText: 'Max 50 characters - Primary key',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Describe this action type',
			helpText: 'Max 100 characters',
		},
	],
	
	entity_type: [
		{
			key: 'name',
			label: 'Entity Type Name',
			type: 'text',
			required: true,
			placeholder: 'e.g., IP Address, Domain, File Hash',
			helpText: 'Max 50 characters - Primary key',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Describe this entity type',
			helpText: 'Max 100 characters',
		},
	],
	
	event_type: [
		{
			key: 'name',
			label: 'Event Type Name',
			type: 'text',
			required: true,
			placeholder: 'e.g., Port Scan, Malware Detection',
			helpText: 'Max 50 characters - Primary key',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Describe this event type',
			helpText: 'Max 100 characters',
		},
	],
	
	annotation_type: [
		{
			key: 'name',
			label: 'Annotation Type Name',
			type: 'text',
			required: true,
			placeholder: 'e.g., Observation, Hypothesis',
			helpText: 'Max 50 characters - Primary key',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Describe this annotation type',
			helpText: 'Max 100 characters',
		},
	],

	// Relation Tables
	action_entities: [
		{
			key: 'action_uuid',
			label: 'Action',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Action to correlate an Entity with',
		},
		{
			key: 'relation_type',
			label: 'Relation Type',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Type of relation',
		},
		{
			key: 'entity_uuid',
			label: 'Entity',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Entity to correlate an Action with',
		},
	],

	action_events: [
		{
			key: 'action_uuid',
			label: 'Action',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Action to correlate an Event with',
		},
		{
			key: 'relation_type',
			label: 'Relation Type',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Type of relation',
		},
		{
			key: 'event_uuid',
			label: 'Event',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Event to correlate an Action with',
		},
	],

	event_entities: [
		{
			key: 'event_uuid',
			label: 'Event',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Event to correlate with an Entity',
		},
		{
			key: 'relation_type',
			label: 'Relation Type',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Type of relation',
		},
		{
			key: 'entity_uuid',
			label: 'Entity',
			type: 'select',
			required: true,
			options: [],
			helpText: 'Entity to correlate an Event with',
		},
	]
};
