CREATE TABLE `email_recipient_verifications` (
	`email` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`state` text NOT NULL,
	`reason` text,
	`score` integer,
	`checked_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_recipient_verifications_expires_idx` ON `email_recipient_verifications` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `email_suppressions` (
	`email` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`reason` text NOT NULL,
	`provider_message_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `email_suppressions_source_idx` ON `email_suppressions` (`source`);
