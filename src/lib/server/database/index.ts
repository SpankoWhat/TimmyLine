import { type TimelineEvent } from './02_02_core_timeline_events';
import { type InvestigationAction } from './02_03_core_investigation_actions';
import { type EventEntity } from './03_01_junction_event_entities';
import { type ActionEvent } from './03_00_junction_action_events';
import { type ActionEntity } from './03_02_junction_action_entities';
import { type Entity } from './02_05_core_entities';

// Lookup tables
export * from './01_01_lookup_event_type';
export * from './01_02_lookup_action_type';
export * from './01_03_lookup_relation_type';
export * from './01_04_lookup_annotation_type';
export * from './01_05_lookup_entity_type';
export * from './01_06_auth_users';
export * from './01_07_auth_accounts';
export * from './01_08_auth_sessions';
export * from './01_09_auth_verification_tokens';

// Core tables
export * from './02_00_core_analysts';
export * from './02_01_core_incidents';
export * from './02_02_core_timeline_events';
export * from './02_03_core_investigation_actions';
export * from './02_04_core_annotations';
export * from './02_05_core_entities';

// Junction tables
export * from './03_00_junction_action_events';
export * from './03_01_junction_event_entities';
export * from './03_02_junction_action_entities';
export * from './03_03_junction_annotation_references';

// TypeScript types for enriched data (with relations)
export type EnrichedTimelineEvent = TimelineEvent & {
    eventEntities?: Array<EventEntity & {
        entity: Entity;
    }>;
    actionEvents?: Array<ActionEvent & {
        action: InvestigationAction;
    }>;
};

export type EnrichedInvestigationAction = InvestigationAction & {
    actionEvents?: Array<ActionEvent & {
        event: TimelineEvent;
    }>;
    actionEntities?: Array<ActionEntity & {
        entity: Entity;
    }>;
};
