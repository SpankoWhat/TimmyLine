import { createEntityHandler } from '../helpers';

export const analystHandler = createEntityHandler({
	entityKey: 'analyst',
	apiPath: 'core/analyst',
});
