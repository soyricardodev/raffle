CREATE TABLE `raffle_promotions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raffle_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`kind` text NOT NULL,
	`scope` text DEFAULT 'all_methods' NOT NULL,
	`raffle_payment_method_id` integer,
	`promo_price_bs_cents` integer,
	`promo_price_usd_cents` integer,
	`discount_percent_bps` integer,
	`starts_at` integer,
	`ends_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`raffle_payment_method_id`) REFERENCES `raffle_payment_methods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `raffle_promotions_raffle_active_idx` ON `raffle_promotions` (`raffle_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `raffle_promotions_raffle_method_idx` ON `raffle_promotions` (`raffle_payment_method_id`);--> statement-breakpoint
CREATE INDEX `raffle_promotions_starts_idx` ON `raffle_promotions` (`starts_at`);--> statement-breakpoint
CREATE INDEX `raffle_promotions_ends_idx` ON `raffle_promotions` (`ends_at`);--> statement-breakpoint
ALTER TABLE `purchases` ADD `promotion_id` integer;--> statement-breakpoint
ALTER TABLE `purchases` ADD `original_unit_price_cents` integer;--> statement-breakpoint
ALTER TABLE `purchases` ADD `discount_unit_cents` integer;--> statement-breakpoint
ALTER TABLE `purchases` ADD `final_unit_price_cents` integer;
