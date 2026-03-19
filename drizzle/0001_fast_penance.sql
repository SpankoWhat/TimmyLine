CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`key_prefix` text(16) NOT NULL,
	`key_hash` text NOT NULL,
	`name` text(100) NOT NULL,
	`user_id` text NOT NULL,
	`analyst_uuid` text NOT NULL,
	`role` text DEFAULT 'analyst' NOT NULL,
	`last_used_at` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`analyst_uuid`) REFERENCES `analysts`(`uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_timeline_events_incident_id` ON `timeline_events` (`incident_id`);--> statement-breakpoint
CREATE INDEX `idx_timeline_events_discovered_at` ON `timeline_events` (`discovered_at`);--> statement-breakpoint
CREATE INDEX `idx_investigation_actions_incident_id` ON `investigation_actions` (`incident_id`);--> statement-breakpoint
CREATE INDEX `idx_annotations_incident_id` ON `annotations` (`incident_id`);--> statement-breakpoint
CREATE INDEX `idx_action_events_event_id` ON `action_events` (`event_id`);--> statement-breakpoint
CREATE INDEX `idx_event_entities_entity_id` ON `event_entities` (`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_action_entities_entity_id` ON `action_entities` (`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_annotation_references_reference_id` ON `annotation_references` (`reference_id`);