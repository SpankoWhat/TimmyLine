import { createEntityHandler } from '../helpers';
import { entityTypes } from '$lib/stores/cacheStore';

export const entityHandler = createEntityHandler({
	entityKey: 'entity',
	apiPath: 'core/entity',
	analystKey: 'entered_by',
	storeEnrichments: { entity_type: entityTypes },
	epochFields: [
		{ key: 'first_seen' },
		{ key: 'last_seen' },
	],
});
