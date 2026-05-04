import type { Component } from 'svelte';

/**
 * Configuration for a registered timeline view.
 * Each view provides a different visualization of the same underlying timeline data.
 */
export interface TimelineViewConfig {
	/** Unique identifier, e.g. 'log', 'vertical', 'graph' */
	id: string;
	/** Short human-readable label for the toolbar button */
	label: string;
	/** Icon identifier — corresponds to an inline SVG in ViewSwitcher */
	icon: 'list' | 'timeline' | 'entities';
	/** Tooltip / description text */
	description: string;
	/** Lazy-loaded Svelte component */
	component: () => Promise<{ default: Component<any> }>;
}

/**
 * Registry of all available timeline views.
 * Order determines display order in the ViewSwitcher toolbar.
 */
export const timelineViews: TimelineViewConfig[] = [
	{
		id: 'log',
		label: 'Log',
		icon: 'list',
		description: 'Dense log-style rows (default)',
		component: () => import('$lib/components/views/DefaultLogView.svelte')
	},
	{
		id: 'vertical',
		label: 'Timeline',
		icon: 'timeline',
		description: 'Chronological vertical timeline with cards',
		component: () => import('$lib/components/views/VerticalTimelineView.svelte')
	},
	{
		id: 'entities',
		label: 'Entities',
		icon: 'entities',
		description: 'IOC-centric entity view with related events and actions',
		component: () => import('$lib/components/views/EntityTimelineView.svelte')
	},
];
