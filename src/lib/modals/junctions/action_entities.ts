import { createJunctionHandler } from '../helpers';

export const actionEntitiesHandler = createJunctionHandler('action_entities', [
	{
		key: 'action_uuid',
		store: 'actions',
		labelFn: (a: any) => `${a.action_type} - ${a.notes}`
	},
	{
		key: 'entity_uuid',
		store: 'entities',
		labelFn: (e: any) => `${e.entity_type} - ${e.identifier}`
	}
]);
