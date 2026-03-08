/**
 * Modal Registry — Slim store + config factory.
 *
 * Individual modal components now own their own fields, validation, and
 * submission logic. This module only manages the open/close state and
 * provides `createModalConfig` so callsites don't need to change.
 */

import { writable } from 'svelte/store';
import type { EntityType, ModalMode, ModalConfig } from './types';

// ---------------------------------------------------------------------------
// Modal store (unchanged API — every consumer still does modalStore.open/close)
// ---------------------------------------------------------------------------

const createModalStore = () => {
	const { subscribe, set } = writable<ModalConfig | null>(null);

	return {
		subscribe,
		open: (config: Omit<ModalConfig, 'isOpen'>) => {
			set({ ...config, isOpen: true });
		},
		close: () => {
			set(null);
		}
	};
};

export const modalStore = createModalStore();

// ---------------------------------------------------------------------------
// Config factory (unchanged — every consumer still calls createModalConfig)
// ---------------------------------------------------------------------------

/**
 * Create a complete modal configuration for opening a modal.
 *
 * @param entityType - The type of entity to create/edit
 * @param mode - The modal mode (create, edit, view, delete)
 * @param existingData - Optional existing data for edit/view modes
 */
export function createModalConfig(
	entityType: EntityType,
	mode: ModalMode = 'create',
	existingData?: any
): Omit<ModalConfig, 'isOpen'> {
	return {
		title: entityType.replace(/_/g, ' '),
		entityType,
		mode,
		data: existingData
	};
}
