/**
 * Type interfaces for lookup table CRUD operations.
 */

import type { LookupTableName } from './common';

export interface ListLookupsParams {
	table: LookupTableName;
	include_deleted?: boolean;
}

export interface CreateLookupData {
	table: LookupTableName;
	name: string;
	description: string;
}

export interface UpdateLookupData {
	table: LookupTableName;
	old_name: string;
	name: string;
	description: string;
}

export interface SoftDeleteLookupData {
	table: LookupTableName;
	name: string;
}

export interface RestoreLookupData {
	table: LookupTableName;
	name: string;
}

export interface DeleteLookupData {
	table: LookupTableName;
	name: string;
}
