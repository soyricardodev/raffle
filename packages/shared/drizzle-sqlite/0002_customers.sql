CREATE TABLE `customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_phone_normalized` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_ci` text NOT NULL,
	`customer_ci_normalized` text NOT NULL,
	`customer_location` text NOT NULL,
	`location_type` text DEFAULT 'venezuela' NOT NULL,
	`venezuela_state` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_phone_ci_uidx` ON `customers` (`customer_phone_normalized`,`customer_ci_normalized`);--> statement-breakpoint
CREATE INDEX `customers_phone_norm_idx` ON `customers` (`customer_phone_normalized`);--> statement-breakpoint
CREATE INDEX `customers_ci_norm_idx` ON `customers` (`customer_ci_normalized`);--> statement-breakpoint
CREATE INDEX `customers_email_idx` ON `customers` (`customer_email`);--> statement-breakpoint
ALTER TABLE `purchases` ADD `customer_id` integer REFERENCES `customers`(`id`) ON DELETE set null;
