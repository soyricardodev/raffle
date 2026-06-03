CREATE TABLE `client_analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_name` text NOT NULL,
	`properties` text,
	`session_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `client_analytics_events_name_idx` ON `client_analytics_events` (`event_name`);--> statement-breakpoint
CREATE INDEX `client_analytics_events_created_idx` ON `client_analytics_events` (`created_at`);
