import { createJunctionHandler } from '../helpers';

export const actionEventsHandler = createJunctionHandler('action_events', [
	{
		key: 'action_uuid',
		store: 'actions',
		labelFn: (a: any) => `${a.action_type} - ${a.notes || 'No notes'}`
	},
	{
		key: 'event_uuid',
		store: 'events',
		labelFn: (e: any) => `${e.event_type} - ${e.event_data}`
	}
]);
