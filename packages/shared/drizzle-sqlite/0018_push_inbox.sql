ALTER TABLE `push_broadcasts` ADD `url` text DEFAULT '/' NOT NULL;
--> statement-breakpoint
CREATE TABLE `push_inbox_reads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`subscription_id` integer NOT NULL,
	`broadcast_id` integer NOT NULL,
	`read_at` integer NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`broadcast_id`) REFERENCES `push_broadcasts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_inbox_reads_sub_broadcast_uidx` ON `push_inbox_reads` (`subscription_id`, `broadcast_id`);
--> statement-breakpoint
CREATE INDEX `push_inbox_reads_sub_idx` ON `push_inbox_reads` (`subscription_id`);
