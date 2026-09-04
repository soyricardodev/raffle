CREATE TABLE `push_auto_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text DEFAULT 'percent' NOT NULL,
	`trigger_percent` integer,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`legacy_milestone_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `push_auto_alerts_sort_idx` ON `push_auto_alerts` (`sort_order`,`trigger_percent`);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_auto_alerts_legacy_uidx` ON `push_auto_alerts` (`legacy_milestone_id`);
--> statement-breakpoint
INSERT INTO `push_auto_alerts` (`kind`, `trigger_percent`, `title`, `body`, `enabled`, `sort_order`, `legacy_milestone_id`, `created_at`, `updated_at`) VALUES
('new_raffle', NULL, 'Nueva bendición liberada.', '', 1, 0, 'new_raffle', unixepoch() * 1000, unixepoch() * 1000),
('percent', 10, 'Ya se fue el 10%.', '', 1, 10, 'sold_10', unixepoch() * 1000, unixepoch() * 1000),
('percent', 30, 'Último 70% disponible.', '', 1, 20, 'remaining_70', unixepoch() * 1000, unixepoch() * 1000),
('percent', 50, 'Último 50% disponible.', '', 1, 30, 'sold_50', unixepoch() * 1000, unixepoch() * 1000),
('percent', 70, '¡Lo que queda! Último 30% disponible.', '', 1, 40, 'remaining_30', unixepoch() * 1000, unixepoch() * 1000),
('percent', 90, '¡Última oportunidad! 10% es lo que queda.', '', 1, 50, 'remaining_10', unixepoch() * 1000, unixepoch() * 1000);
