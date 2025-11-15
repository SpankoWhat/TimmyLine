/**
 * Configuration file that holds types and field values for the various modal forms.
 * @todo Handle the dynamic population of the lookup tables as a function that can be called to get the latest values.
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'checkbox';

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

export const entityFieldConfigs: Record<string, FieldConfig[]> = {
	incident: [
		{
			key: 'title',
			label: 'Incident Title',
			type: 'text',
			required: true,
			placeholder: 'Brief description of the incident',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Detailed incident description',
		},
		{
			key: 'priority',
			label: 'Priority',
			type: 'select',
			required: true,
			options: [
				{ value: 'critical', label: 'Critical' },
				{ value: 'high', label: 'High' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'low', label: 'Low' },
			],
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
		{
			key: 'discovered_at',
			label: 'Discovered At',
			type: 'datetime',
			required: true,
		},
	],
	
	timeline_event: [
		{
			key: 'event_type',
			label: 'Event Type',
			type: 'select',
			required: true,
			options: [], // Populated dynamically from eventTypes store
		},
		{
			key: 'occurred_at',
			label: 'Occurred At',
			type: 'datetime',
			required: true,
		},
		{
			key: 'severity',
			label: 'Severity',
			type: 'select',
			required: true,
			options: [
				{ value: 'critical', label: 'Critical' },
				{ value: 'high', label: 'High' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'low', label: 'Low' },
				{ value: 'info', label: 'Info' },
			],
		},
		{
			key: 'source',
			label: 'Source',
			type: 'text',
			placeholder: 'e.g., Firewall, EDR, SIEM',
		},
		{
			key: 'discovered_at',
			label: 'Discovered At',
			type: 'datetime',
			required: false,
		},
		{
			key: 'source_reliability',
			label: 'Source Reliability',
			type: 'select',
			required: false,
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
			key: 'description',
			label: 'Description',
			type: 'textarea',
		},
	],
	
	investigation_action: [
		{
			key: 'action_type',
			label: 'Action Type',
			type: 'select',
			required: true,
			options: [], // Populated from actionTypes store
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
			required: true,
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
		},
	],
	
	entity: [
		{
			key: 'entity_type',
			label: 'Entity Type',
			type: 'select',
			required: true,
			options: [], // Populated from entityTypes store
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
			key: 'identifier',
			label: 'Identifier',
			type: 'text',
			required: true,
			placeholder: 'e.g., IP address, hostname, file hash',
		},
		{
			key: 'display_name',
			label: 'Display Name',
			type: 'text',
			placeholder: 'Human-friendly name for the entity',
		},
		{
			key: 'status',
			label: 'Status',
			type: 'select',
			required: true,
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
			required: true,
			options: [
				{ value: 'critical', label: 'Critical' },
				{ value: 'high', label: 'High' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'low', label: 'Low' },
				{ value: 'unknown', label: 'Unknown' },
			],
		},
		{
			key: 'tags',
			label: 'Tags',
			type: 'text',
		},
		{
			key: 'attributes',
			label: 'Attributes',
			type: 'textarea',
		},
	],
	
	annotation: [
		{
			key: 'annotation_type',
			label: 'Annotation Type',
			type: 'select',
			required: true,
			options: [], // Populated from annotationTypes store
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
			required: true,
			options: [
				{ value: 'high', label: 'High' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'low', label: 'Low' },
				{ value: 'guess', label: 'Guess' },
			],
		},
		{
			key: 'is_hypothesis',
			label: 'Is Hypothesis',
			type: 'checkbox',
		},
		{
			key: 'tags',
			label: 'Tags',
			type: 'text',
			placeholder: 'Add your tags',
		},
	],

	analyst: [
		{
			key: 'username',
			label: 'Username',
			type: 'text',
			required: true,
			placeholder: 'Your username',
		},
		{
			key: 'full_name',
			label: 'Full Name',
			type: 'text',
			placeholder: 'John Doe',
		},
		{
			key: 'role',
			label: 'Role',
			type: 'select',
			options: [{
				value: 'analyst',
				label: 'Analyst'
			}, {
				value: 'on-point lead',
				label: 'On-Point Lead'
			}, {
				value: 'observer',
				label: 'Observer'
			}],
			defaultValue: 'analyst'
		},

	],

	// Lookup tables (simpler configs)
	action_type: [
		{
			key: 'name',
			label: 'Action Type Name',
			type: 'text',
			required: true,
			placeholder: 'e.g., Analyze Logs, Block IP',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Describe this action type',
		},
	],
	
	entity_type: [
		{
			key: 'name',
			label: 'Entity Type Name',
			type: 'text',
			required: true,
			placeholder: 'e.g., IP Address, Domain, File Hash',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Describe this entity type',
		},
	],
	
	event_type: [
		{
			key: 'name',
			label: 'Event Type Name',
			type: 'text',
			required: true,
			placeholder: 'e.g., Port Scan, Malware Detection',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Describe this event type',
		},
	],
	
	annotation_type: [
		{
			key: 'name',
			label: 'Annotation Type Name',
			type: 'text',
			required: true,
			placeholder: 'e.g., Observation, Hypothesis',
		},
		{
			key: 'description',
			label: 'Description',
			type: 'textarea',
			placeholder: 'Describe this annotation type',
		},
	]
};
