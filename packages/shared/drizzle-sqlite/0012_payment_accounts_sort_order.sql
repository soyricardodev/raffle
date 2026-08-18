ALTER TABLE `payment_accounts` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Pago móvil first for buyers; other methods follow by id. Admin can reorder afterwards.
UPDATE `payment_accounts`
SET `sort_order` = CASE
  WHEN `method_type` = 'pago_movil' THEN `id`
  ELSE `id` + 100000
END;--> statement-breakpoint
CREATE INDEX `payment_accounts_sort_order_idx` ON `payment_accounts` (`sort_order`);
