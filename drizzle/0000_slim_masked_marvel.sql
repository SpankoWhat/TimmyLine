CREATE TABLE `event_type` (
	`name` text(50) PRIMARY KEY NOT NULL,
	`description` text(100)
);
--> statement-breakpoint
CREATE TABLE `action_type` (
	`name` text(50) PRIMARY KEY NOT NULL,
	`description` text(100)
);
--> statement-breakpoint
CREATE TABLE `relation_type` (
	`name` text(50) PRIMARY KEY NOT NULL,
	`description` text(100)
);
--> statement-breakpoint
CREATE TABLE `annotation_type` (
	`name` text(50) PRIMARY KEY NOT NULL,
	`description` text(100)
);
--> statement-breakpoint
CREATE TABLE `entity_type` (
	`name` text(50) PRIMARY KEY NOT NULL,
	`description` text(100)
);
--> statement-breakpoint
CREATE TABLE `analysts` (
	`uuid` text PRIMARY KEY NOT NULL,
	`username` text(100) NOT NULL,
	`full_name` text(100),
	`role` text,
	`active` integer DEFAULT 1,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analysts_username_unique` ON `analysts` (`username`);--> statement-breakpoint
CREATE TABLE `incidents` (
	`uuid` text PRIMARY KEY NOT NULL,
	`soar_ticket_id` text(10),
	`title` text(500) NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incidents_soar_ticket_id_unique` ON `incidents` (`soar_ticket_id`);--> statement-breakpoint
CREATE TABLE `timeline_events` (
	`uuid` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`discovered_by` text NOT NULL,
	`event_type` text(50) NOT NULL,
	`occurred_at` integer,
	`discovered_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`event_data` text NOT NULL,
	`severity` text,
	`confidence` text,
	`source_reliability` text,
	`source` text(200),
	`tags` text,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discovered_by`) REFERENCES `analysts`(`uuid`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`event_type`) REFERENCES `event_type`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `investigation_actions` (
	`uuid` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`actioned_by` text NOT NULL,
	`action_type` text(50) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`performed_at` integer NOT NULL,
	`action_data` text,
	`result` text,
	`tool_used` text(100),
	`notes` text,
	`next_steps` text,
	`tags` text,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actioned_by`) REFERENCES `analysts`(`uuid`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`action_type`) REFERENCES `action_type`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `annotations` (
	`uuid` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`noted_by` text NOT NULL,
	`annotation_type` text(50) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`content` text NOT NULL,
	`confidence` text,
	`refers_to` text,
	`is_hypothesis` integer DEFAULT 0,
	`tags` text,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`noted_by`) REFERENCES `analysts`(`uuid`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`annotation_type`) REFERENCES `annotation_type`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`uuid` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`entered_by` text NOT NULL,
	`entity_type` text(50) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`first_seen` integer,
	`last_seen` integer,
	`identifier` text(500) NOT NULL,
	`display_name` text(200),
	`attributes` text,
	`status` text,
	`criticality` text,
	`tags` text,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entered_by`) REFERENCES `analysts`(`uuid`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`entity_type`) REFERENCES `entity_type`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_incident_identifier` ON `entities` (`incident_id`,`identifier`);--> statement-breakpoint
CREATE TABLE `action_events` (
	`action_id` text NOT NULL,
	`event_id` text NOT NULL,
	`relation_type` text(50) NOT NULL,
	PRIMARY KEY(`action_id`, `event_id`),
	FOREIGN KEY (`action_id`) REFERENCES `investigation_actions`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `timeline_events`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`relation_type`) REFERENCES `relation_type`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `event_entities` (
	`event_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`role` text,
	`context` text,
	PRIMARY KEY(`event_id`, `entity_id`),
	FOREIGN KEY (`event_id`) REFERENCES `timeline_events`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `action_entities` (
	`action_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`relation_type` text(50) NOT NULL,
	PRIMARY KEY(`action_id`, `entity_id`),
	FOREIGN KEY (`action_id`) REFERENCES `investigation_actions`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`entity_id`) REFERENCES `entities`(`uuid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`relation_type`) REFERENCES `relation_type`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `annotation_references` (
	`annotation_id` text NOT NULL,
	`reference_type` text,
	`reference_id` text NOT NULL,
	`context` text,
	PRIMARY KEY(`annotation_id`, `reference_type`, `reference_id`),
	FOREIGN KEY (`annotation_id`) REFERENCES `annotations`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

-- Update timestamp triggers for incidents
CREATE TRIGGER IF NOT EXISTS update_incidents_timestamp 
AFTER UPDATE ON incidents
BEGIN
    UPDATE incidents SET updated_at = strftime('%s', 'now') WHERE uuid = NEW.uuid;
END;
--> statement-breakpoint
-- Update timestamp triggers for timeline_events
CREATE TRIGGER IF NOT EXISTS update_timeline_events_timestamp 
AFTER UPDATE ON timeline_events
BEGIN
    UPDATE timeline_events SET updated_at = strftime('%s', 'now') WHERE uuid = NEW.uuid;
END;
--> statement-breakpoint
-- Update timestamp triggers for investigation_actions
CREATE TRIGGER IF NOT EXISTS update_investigation_actions_timestamp 
AFTER UPDATE ON investigation_actions
BEGIN
    UPDATE investigation_actions SET updated_at = strftime('%s', 'now') WHERE uuid = NEW.uuid;
END;
--> statement-breakpoint
-- Update timestamp triggers for annotations
CREATE TRIGGER IF NOT EXISTS update_annotations_timestamp 
AFTER UPDATE ON annotations
BEGIN
    UPDATE annotations SET updated_at = strftime('%s', 'now') WHERE uuid = NEW.uuid;
END;
--> statement-breakpoint
-- Update timestamp triggers for entities
CREATE TRIGGER IF NOT EXISTS update_entities_timestamp 
AFTER UPDATE ON entities
BEGIN
    UPDATE entities SET updated_at = strftime('%s', 'now') WHERE uuid = NEW.uuid;
END;
--> statement-breakpoint
-- Update timestamp triggers for analysts
CREATE TRIGGER IF NOT EXISTS update_analysts_timestamp 
AFTER UPDATE ON analysts
BEGIN
    UPDATE analysts SET updated_at = strftime('%s', 'now') WHERE uuid = NEW.uuid;
END;
