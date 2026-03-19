ALTER TABLE `event_type` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `action_type` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `relation_type` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `annotation_type` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `entity_type` ADD `deleted_at` integer;