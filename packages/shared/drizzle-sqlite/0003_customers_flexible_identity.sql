DROP INDEX IF EXISTS `customers_phone_norm_uidx`;--> statement-breakpoint
DROP INDEX IF EXISTS `customers_ci_norm_uidx`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `customers_phone_ci_uidx` ON `customers` (`customer_phone_normalized`,`customer_ci_normalized`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `customers_phone_norm_idx` ON `customers` (`customer_phone_normalized`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `customers_ci_norm_idx` ON `customers` (`customer_ci_normalized`);
