CREATE TABLE `raffle_buyer_presence` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raffle_id` integer NOT NULL,
	`client_id` text NOT NULL,
	`last_seen_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raffle_buyer_presence_raffle_client_uidx` ON `raffle_buyer_presence` (`raffle_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `raffle_buyer_presence_raffle_seen_idx` ON `raffle_buyer_presence` (`raffle_id`,`last_seen_at`);
