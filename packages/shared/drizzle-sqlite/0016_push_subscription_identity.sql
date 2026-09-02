ALTER TABLE `push_subscriptions` ADD `display_name` text;
--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD `customer_phone_normalized` text;
--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD `customer_id` integer REFERENCES `customers`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX `push_subscriptions_phone_norm_idx` ON `push_subscriptions` (`customer_phone_normalized`);
