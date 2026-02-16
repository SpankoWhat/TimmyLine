import { createJunctionHandler } from '../helpers';

export const eventEntitiesHandler = createJunctionHandler('event_entities', [
	{
		key: 'event_uuid',
		store: 'events',
		labelFn: (e: any) => `${e.event_type} - ${e.event_data}`
	},
	{
		key: 'entity_uuid',
		store: 'entities',
		labelFn: (ent: any) => `${ent.entity_type} - ${ent.identifier}`
	}
]);
