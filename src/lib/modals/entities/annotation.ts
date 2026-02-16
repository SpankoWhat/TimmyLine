import { createEntityHandler } from '../helpers';
import { annotationTypes } from '$lib/stores/cacheStore';

export const annotationHandler = createEntityHandler({
	entityKey: 'annotation',
	apiPath: 'core/annotation',
	analystKey: 'noted_by',
	storeEnrichments: { annotation_type: annotationTypes },
});
