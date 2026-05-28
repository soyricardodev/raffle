CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`settings` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` text,
	`raffle_id` integer,
	`purchase_id` integer,
	`action` text NOT NULL,
	`payload` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_events_raffle_idx` ON `audit_events` (`raffle_id`);--> statement-breakpoint
CREATE INDEX `audit_events_purchase_idx` ON `audit_events` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `audit_events_created_idx` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer,
	`recipient_email` text NOT NULL,
	`email_type` text NOT NULL,
	`subject` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`resend_email_id` text,
	`error_message` text,
	`metadata` text,
	`idempotency_key` text,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `email_logs_purchase_idx` ON `email_logs` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `email_logs_created_idx` ON `email_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `email_logs_idempotency_idx` ON `email_logs` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raffle_id` integer NOT NULL,
	`method_type` text NOT NULL,
	`account_info` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`min_tickets` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payment_methods_raffle_active_idx` ON `payment_methods` (`raffle_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `prizes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raffle_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image_url` text,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prizes_raffle_position_idx` ON `prizes` (`raffle_id`,`position`);--> statement-breakpoint
CREATE TABLE `purchase_tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`raffle_id` integer NOT NULL,
	`purchase_id` integer NOT NULL,
	`ticket_number` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_tickets_raffle_number_uidx` ON `purchase_tickets` (`raffle_id`,`ticket_number`);--> statement-breakpoint
CREATE INDEX `purchase_tickets_purchase_idx` ON `purchase_tickets` (`purchase_id`);--> statement-breakpoint
CREATE INDEX `purchase_tickets_raffle_status_idx` ON `purchase_tickets` (`raffle_id`,`status`);--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`public_id` text NOT NULL,
	`raffle_id` integer NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`customer_phone_normalized` text NOT NULL,
	`customer_email` text,
	`customer_ci` text,
	`customer_location` text,
	`payment_method` text NOT NULL,
	`payment_reference` text,
	`payment_proof_url` text,
	`ticket_quantity` integer NOT NULL,
	`total_amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_public_id_unique` ON `purchases` (`public_id`);--> statement-breakpoint
CREATE INDEX `purchases_raffle_status_idx` ON `purchases` (`raffle_id`,`status`);--> statement-breakpoint
CREATE INDEX `purchases_raffle_created_idx` ON `purchases` (`raffle_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `purchases_phone_norm_idx` ON `purchases` (`customer_phone_normalized`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_raffle_payment_ref_uidx` ON `purchases` (`raffle_id`,`payment_reference`) WHERE "purchases"."payment_reference" IS NOT NULL AND "purchases"."payment_reference" != '';--> statement-breakpoint
CREATE TABLE `raffles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image_url` text,
	`total_tickets` integer NOT NULL,
	`price_bs_cents` integer NOT NULL,
	`price_usd_cents` integer NOT NULL,
	`min_purchase` integer DEFAULT 1 NOT NULL,
	`max_purchase` integer DEFAULT 10 NOT NULL,
	`draw_date` integer,
	`days_for_draw` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`pause_until` integer,
	`pause_reason` text,
	`auto_pause_enabled` integer DEFAULT true NOT NULL,
	`publish` integer DEFAULT false NOT NULL,
	`tickets_available` integer DEFAULT 0 NOT NULL,
	`tickets_reserved` integer DEFAULT 0 NOT NULL,
	`tickets_sold` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `raffles_status_idx` ON `raffles` (`status`);--> statement-breakpoint
CREATE INDEX `raffles_draw_date_idx` ON `raffles` (`draw_date`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_expires_at_idx` ON `session` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'admin' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);