import { createEntityHandler } from '../helpers';

export const incidentHandler = createEntityHandler({
	entityKey: 'incident',
	apiPath: 'core/incident',
});
