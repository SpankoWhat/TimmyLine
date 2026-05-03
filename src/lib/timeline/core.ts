import { displayFieldsConfig, type DisplayField } from '$lib/config/displayFieldsConfig';
import type { InvestigationAction, TimelineEvent } from '$lib/server/database';
import { getTimelineDateKey } from '$lib/utils/dateTime';
import { discoverDynamicFields } from '$lib/utils/fieldUtils';

export type TimelineItem = {
	uuid: string;
	type: 'event' | 'action';
	timestamp: number;
	data: TimelineEvent | InvestigationAction;
};

export type KnownJsonKeys = {
	event: string[];
	action: string[];
};

export type TimelineRelationshipOption = {
	uuid: string;
	label: string;
	sublabel?: string;
};

export type DateSeparatorNode = {
	kind: 'date-separator';
	dateKey: string;
	anchorEpoch: number;
};

export type GapNode = {
	kind: 'gap';
	durationSeconds: number;
};

export type ClusterNode = {
	kind: 'cluster';
	items: TimelineItem[];
	durationSeconds: number;
};

export type ItemNode = {
	kind: 'item';
	item: TimelineItem;
};

export type ProcessedTimelineNode = DateSeparatorNode | GapNode | ClusterNode | ItemNode;

type TimelineEventLike = Record<string, unknown> & {
	uuid: string;
	occurred_at?: number | null;
	discovered_at?: number | null;
};

type InvestigationActionLike = Record<string, unknown> & {
	uuid: string;
	performed_at?: number | null;
};

export const TIMELINE_GAP_THRESHOLD_SECONDS = 1800;
export const TIMELINE_CLUSTER_WINDOW_SECONDS = 60;
export const TIMELINE_CLUSTER_MIN_ITEMS = 4;

export function createEventTimelineItem(event: TimelineEventLike): TimelineItem {
	return {
		uuid: event.uuid,
		type: 'event',
		timestamp: event.occurred_at || event.discovered_at || 0,
		data: event as unknown as TimelineEvent
	};
}

export function createActionTimelineItem(action: InvestigationActionLike): TimelineItem {
	return {
		uuid: action.uuid,
		type: 'action',
		timestamp: action.performed_at || 0,
		data: action as unknown as InvestigationAction
	};
}

export function sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
	return [...items].sort((a, b) => a.timestamp - b.timestamp);
}

export function buildTimelineItems(
	events: TimelineEventLike[],
	actions: InvestigationActionLike[]
): TimelineItem[] {
	return sortTimelineItems([
		...events.map(createEventTimelineItem),
		...actions.map(createActionTimelineItem)
	]);
}

export function upsertTimelineItem(items: TimelineItem[], nextItem: TimelineItem): TimelineItem[] {
	const index = items.findIndex((item) => item.type === nextItem.type && item.uuid === nextItem.uuid);
	const nextItems = index >= 0
		? items.map((item, currentIndex) => (currentIndex === index ? nextItem : item))
		: [...items, nextItem];

	return sortTimelineItems(nextItems);
}

export function removeTimelineItem(
	items: TimelineItem[],
	type: TimelineItem['type'],
	uuid: string
): TimelineItem[] {
	return items.filter((item) => !(item.type === type && item.uuid === uuid));
}

export function filterTimelineItems(items: TimelineItem[], query: string): TimelineItem[] {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) {
		return items;
	}

	return items.filter((item) => {
		const data = item.data as Record<string, unknown>;
		return Object.values(data).some((value) => {
			if (value == null) return false;
			if (typeof value === 'string') return value.toLowerCase().includes(normalizedQuery);
			if (typeof value === 'number') return String(value).includes(normalizedQuery);
			return false;
		});
	});
}

export function collectKnownJsonKeys(items: TimelineItem[]): KnownJsonKeys {
	const eventKeys = new Set<string>();
	const actionKeys = new Set<string>();

	for (const item of items) {
		const jsonField = item.type === 'event'
			? (item.data as Record<string, unknown>).event_data
			: (item.data as Record<string, unknown>).action_data;
		const targetSet = item.type === 'event' ? eventKeys : actionKeys;

		if (typeof jsonField !== 'string' || !jsonField) continue;

		try {
			const parsed = JSON.parse(jsonField);
			if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
				for (const key of Object.keys(parsed)) {
					targetSet.add(key);
				}
			}
		} catch {
			// Ignore invalid JSON values in timeline payloads.
		}
	}

	return {
		event: [...eventKeys].sort(),
		action: [...actionKeys].sort()
	};
}

export function discoverTimelineDynamicFields(items: TimelineItem[]): {
	event: Map<string, DisplayField[]>;
	action: Map<string, DisplayField[]>;
} {
	const discoveryInput = items.map((item) => ({
		type: item.type,
		data: item.data as Record<string, unknown>
	}));

	return {
		event: discoverDynamicFields(discoveryInput, displayFieldsConfig, 'event'),
		action: discoverDynamicFields(discoveryInput, displayFieldsConfig, 'action')
	};
}

export function buildTimelineRelationshipOptions(
	items: TimelineItem[],
	type: TimelineItem['type']
): TimelineRelationshipOption[] {
	return items
		.filter((item) => item.type === type)
		.map((item) => {
			const data = item.data as Record<string, unknown>;
			const label = type === 'event'
				? (data.event_type as string | undefined) ?? 'Event'
				: (data.action_type as string | undefined) ?? 'Action';
			const detailParts = type === 'event'
				? [data.source, data.notes]
				: [data.tool_used, data.notes];
			const description = detailParts.filter(Boolean).join(' — ');

			return {
				uuid: item.uuid,
				label,
				sublabel: description
					? (description.length > 60 ? `${description.slice(0, 57)}...` : description)
					: undefined
			};
		});
}

export function buildTimelineItemsByUuid(items: TimelineItem[]): Map<string, TimelineItem> {
	return new Map(items.map((item) => [item.uuid, item]));
}

export function buildEntityReferenceIndex(items: TimelineItem[]): Map<string, string[]> {
	const references = new Map<string, Set<string>>();

	for (const item of items) {
		const relationships = item.type === 'event'
			? ((item.data as Record<string, unknown>).eventEntities as Array<Record<string, unknown>> | undefined) ?? []
			: ((item.data as Record<string, unknown>).actionEntities as Array<Record<string, unknown>> | undefined) ?? [];

		for (const relationship of relationships) {
			const entity = relationship.entity as Record<string, unknown> | undefined;
			const entityUuid = entity?.uuid as string | undefined;
			if (!entityUuid) continue;

			const existing = references.get(entityUuid) ?? new Set<string>();
			existing.add(item.uuid);
			references.set(entityUuid, existing);
		}
	}

	return new Map(
		Array.from(references.entries(), ([entityUuid, itemUuids]) => [entityUuid, [...itemUuids]])
	);
}

export function processTimelineItems(
	sourceItems: TimelineItem[],
	timezone: string,
	options: {
		gapThresholdSeconds?: number;
		clusterWindowSeconds?: number;
		clusterMinItems?: number;
	} = {}
): ProcessedTimelineNode[] {
	if (sourceItems.length === 0) return [];

	const gapThresholdSeconds = options.gapThresholdSeconds ?? TIMELINE_GAP_THRESHOLD_SECONDS;
	const clusterWindowSeconds = options.clusterWindowSeconds ?? TIMELINE_CLUSTER_WINDOW_SECONDS;
	const clusterMinItems = options.clusterMinItems ?? TIMELINE_CLUSTER_MIN_ITEMS;

	const result: ProcessedTimelineNode[] = [];
	let lastDateKey = '';
	let index = 0;

	while (index < sourceItems.length) {
		const current = sourceItems[index];
		const currentDateKey = getTimelineDateKey(current.timestamp, timezone);

		if (currentDateKey !== lastDateKey) {
			result.push({ kind: 'date-separator', dateKey: currentDateKey, anchorEpoch: current.timestamp });
			lastDateKey = currentDateKey;
		}

		let clusterEnd = index + 1;
		while (
			clusterEnd < sourceItems.length &&
			sourceItems[clusterEnd].timestamp - current.timestamp <= clusterWindowSeconds
		) {
			clusterEnd++;
		}

		const clusterSize = clusterEnd - index;
		if (clusterSize >= clusterMinItems) {
			const clusterItems = sourceItems.slice(index, clusterEnd);
			const durationSeconds =
				clusterItems[clusterItems.length - 1].timestamp - clusterItems[0].timestamp;
			result.push({ kind: 'cluster', items: clusterItems, durationSeconds });
			index = clusterEnd;
		} else {
			result.push({ kind: 'item', item: current });
			index++;
		}

		if (index < sourceItems.length) {
			const previous = sourceItems[index - 1];
			const next = sourceItems[index];
			const gapSeconds = next.timestamp - previous.timestamp;

			if (gapSeconds >= gapThresholdSeconds) {
				result.push({ kind: 'gap', durationSeconds: gapSeconds });
			}

			const nextDateKey = getTimelineDateKey(next.timestamp, timezone);
			if (nextDateKey !== lastDateKey) {
				result.push({ kind: 'date-separator', dateKey: nextDateKey, anchorEpoch: next.timestamp });
				lastDateKey = nextDateKey;
			}
		}
	}

	return result;
}