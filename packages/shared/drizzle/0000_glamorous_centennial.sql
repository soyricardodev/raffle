CREATE TABLE `account` (
	`id` varchar(255) NOT NULL,
	`user_id` int NOT NULL,
	`account_id` varchar(255) NOT NULL,
	`provider_id` varchar(255) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` timestamp,
	`refresh_token_expires_at` timestamp,
	`scope` varchar(255),
	`password` varchar(255),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_id` int,
	`recipient_email` varchar(255) NOT NULL,
	`email_type` enum('purchase_confirmation','status_update','ticket_modification') NOT NULL,
	`subject` varchar(500) NOT NULL,
	`status` enum('sent','failed','pending') DEFAULT 'pending',
	`resend_email_id` varchar(100),
	`error_message` text,
	`metadata` json,
	`sent_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`raffle_id` int NOT NULL,
	`method_type` enum('pago_movil','zinli','zelle','binance','bs','usd') NOT NULL,
	`account_info` json NOT NULL,
	`is_active` boolean DEFAULT true,
	`min_tickets` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`raffle_id` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`image_url` varchar(500),
	`position` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `prizes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`raffle_id` int NOT NULL,
	`customer_name` varchar(200) NOT NULL,
	`customer_phone` varchar(20) NOT NULL,
	`customer_email` varchar(100),
	`customer_ci` varchar(20),
	`customer_location` varchar(100),
	`payment_method` enum('pago_movil','zinli','zelle','binance','bs','usd') NOT NULL,
	`payment_reference` varchar(100),
	`payment_proof_url` varchar(500),
	`ticket_quantity` int NOT NULL,
	`total_amount` decimal(15,2) NOT NULL,
	`status` enum('pending','approved','rejected') DEFAULT 'pending',
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raffles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`image_url` varchar(500),
	`total_tickets` int NOT NULL,
	`price_bs` decimal(15,2) NOT NULL,
	`price_usd` decimal(10,2) NOT NULL,
	`min_purchase` int DEFAULT 1,
	`max_purchase` int DEFAULT 10,
	`draw_date` datetime,
	`percentage_mode` boolean DEFAULT false,
	`activation_percentage` int,
	`days_for_draw` int,
	`status` enum('draft','active','paused','finished','cancelled') DEFAULT 'draft',
	`pause_until` timestamp,
	`pause_reason` enum('manual','auto_full','auto_insufficient','auto_timeout'),
	`auto_pause_enabled` boolean DEFAULT true,
	`publish` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `raffles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(255) NOT NULL,
	`user_id` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`ip_address` varchar(255),
	`user_agent` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `site_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`config_value` json NOT NULL,
	`description` text,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_config_config_key_unique` UNIQUE(`config_key`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`raffle_id` int NOT NULL,
	`purchase_id` int,
	`ticket_number` varchar(4) NOT NULL,
	`status` enum('available','reserved','sold') DEFAULT 'available',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_raffle_ticket` UNIQUE(`raffle_id`,`ticket_number`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(50) NOT NULL,
	`email` varchar(100) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','super_admin') NOT NULL DEFAULT 'admin',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(255) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_logs` ADD CONSTRAINT `email_logs_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_raffle_id_raffles_id_fk` FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prizes` ADD CONSTRAINT `prizes_raffle_id_raffles_id_fk` FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchases` ADD CONSTRAINT `purchases_raffle_id_raffles_id_fk` FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_raffle_id_raffles_id_fk` FOREIGN KEY (`raffle_id`) REFERENCES `raffles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_purchase_id_purchases_id_fk` FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE set null ON UPDATE no action;