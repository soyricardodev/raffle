CREATE TABLE `push_broadcasts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`raffle_id` integer,
	`milestone_id` text,
	`promotion_id` integer,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`tag` text NOT NULL,
	`sent` integer DEFAULT 0 NOT NULL,
	`removed` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`promotion_id`) REFERENCES `raffle_promotions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `push_broadcasts_raffle_created_idx` ON `push_broadcasts` (`raffle_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `push_broadcasts_promotion_idx` ON `push_broadcasts` (`promotion_id`);
