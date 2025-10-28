import { writable } from 'svelte/store';

export type ModalConfig = {
	isOpen: boolean;
	title: string;
	entityType: 'incident' | 'timeline_event' | 'investigation_action' | 'entity' | 'annotation' | 'action_type' | 'entity_type' | 'event_type' | 'annotation_type' | 'analyst';
	mode: 'create' | 'edit' | 'view' | 'delete';
	data?: any; // The entity being edited/viewed
	onSubmit?: (data: any) => Promise<void>;
	onCancel?: () => void;
};

const createModalStore = () => {
	const { subscribe, set, update } = writable<ModalConfig | null>(null);

	return {
		subscribe,
		open: (config: Omit<ModalConfig, 'isOpen'>) => {
			set({ ...config, isOpen: true });
		},
		close: () => {
			set(null);
		},
		updateData: (data: any) => {
			update((state) => state ? { ...state, data } : null);
		}
	};
};

export const modalStore = createModalStore();
