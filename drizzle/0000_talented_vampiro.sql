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
CREATE TABLE `auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer,
	`name` text,
	`image` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_email_unique` ON `auth_users` (`email`);--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `auth_verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `analysts` (
	`uuid` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`username` text(100) NOT NULL,
	`email` text(255),
	`full_name` text(100),
	`role` text,
	`active` integer DEFAULT 1,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analysts_user_id_unique` ON `analysts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `analysts_username_unique` ON `analysts` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `analysts_email_unique` ON `analysts` (`email`);--> statement-breakpoint
CREATE TABLE `incidents` (
	`uuid` text PRIMARY KEY NOT NULL,
	`soar_ticket_id` text(10),
	`title` text(500) NOT NULL,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`deleted_at` integer
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
	`notes` text,
	`event_data` text NOT NULL,
	`severity` text,
	`confidence` text,
	`source_reliability` text,
	`source` text(200),
	`tags` text,
	`deleted_at` integer,
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
	`deleted_at` integer,
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
	`deleted_at` integer,
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
	`deleted_at` integer,
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
