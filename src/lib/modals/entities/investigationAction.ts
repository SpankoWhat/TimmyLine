import { createEntityHandler } from '../helpers';
import { actionTypes } from '$lib/stores/cacheStore';

export const investigationActionHandler = createEntityHandler({
	entityKey: 'investigation_action',
	apiPath: 'core/investigation_action',
	analystKey: 'actioned_by',
	storeEnrichments: { action_type: actionTypes },
	epochFields: [
		{ key: 'performed_at', defaultToNow: true },
	],
});
