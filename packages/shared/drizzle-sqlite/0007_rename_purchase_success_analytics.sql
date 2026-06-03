ALTER TABLE `client_analytics_events` RENAME TO `purchase_success_analytics_events`;
--> statement-breakpoint
DROP INDEX IF EXISTS `client_analytics_events_name_idx`;
--> statement-breakpoint
DROP INDEX IF EXISTS `client_analytics_events_created_idx`;
--> statement-breakpoint
CREATE INDEX `purchase_success_analytics_events_name_idx` ON `purchase_success_analytics_events` (`event_name`);
--> statement-breakpoint
CREATE INDEX `purchase_success_analytics_events_created_idx` ON `purchase_success_analytics_events` (`created_at`);
