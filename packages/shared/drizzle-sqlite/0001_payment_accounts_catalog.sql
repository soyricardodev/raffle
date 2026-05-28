CREATE TABLE `payment_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text NOT NULL,
	`method_type` text NOT NULL,
	`account_info` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `payment_accounts_method_active_idx` ON `payment_accounts` (`method_type`,`is_active`);--> statement-breakpoint
CREATE TABLE `raffle_payment_methods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raffle_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`min_tickets` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `payment_accounts`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `raffle_payment_methods_raffle_account_uidx` ON `raffle_payment_methods` (`raffle_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `raffle_payment_methods_raffle_active_idx` ON `raffle_payment_methods` (`raffle_id`,`is_active`);--> statement-breakpoint
ALTER TABLE `purchases` ADD `raffle_payment_method_id` integer REFERENCES `raffle_payment_methods`(`id`) ON DELETE set null;--> statement-breakpoint
-- Migrate legacy per-raffle payment_methods into catalog + assignments
INSERT INTO `payment_accounts` (`label`, `method_type`, `account_info`, `is_active`, `created_at`, `updated_at`)
SELECT
  printf('%s #%d', pm.method_type, pm.id),
  pm.method_type,
  pm.account_info,
  pm.is_active,
  COALESCE(pm.created_at, (strftime('%s','now') * 1000)),
  COALESCE(pm.created_at, (strftime('%s','now') * 1000))
FROM `payment_methods` pm;
--> statement-breakpoint
INSERT INTO `raffle_payment_methods` (`raffle_id`, `account_id`, `is_active`, `min_tickets`, `created_at`)
SELECT
  pm.raffle_id,
  pa.id,
  pm.is_active,
  pm.min_tickets,
  COALESCE(pm.created_at, (strftime('%s','now') * 1000))
FROM `payment_methods` pm
INNER JOIN `payment_accounts` pa ON pa.label = printf('%s #%d', pm.method_type, pm.id);
--> statement-breakpoint
UPDATE `purchases`
SET `raffle_payment_method_id` = (
  SELECT rpm.id
  FROM `raffle_payment_methods` rpm
  INNER JOIN `payment_accounts` pa ON pa.id = rpm.account_id
  WHERE rpm.raffle_id = purchases.raffle_id
    AND pa.method_type = purchases.payment_method
  LIMIT 1
)
WHERE `raffle_payment_method_id` IS NULL;
--> statement-breakpoint
DROP TABLE `payment_methods`;
