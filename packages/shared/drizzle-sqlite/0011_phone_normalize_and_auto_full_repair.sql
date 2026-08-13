-- Canonicalize Venezuelan phone digits so 0412… and +58 412… match on verify.
-- Purchases only: customers.phone+ci is unique, so rewriting both 58… and 0412… rows
-- for the same person would abort the whole migrate.
UPDATE `purchases`
SET `customer_phone_normalized` = CASE
  WHEN length(`customer_phone_normalized`) = 12 AND `customer_phone_normalized` LIKE '58%'
    THEN '0' || substr(`customer_phone_normalized`, 3)
  WHEN length(`customer_phone_normalized`) = 10 AND `customer_phone_normalized` LIKE '4%'
    THEN '0' || `customer_phone_normalized`
  ELSE `customer_phone_normalized`
END
WHERE
  (length(`customer_phone_normalized`) = 12 AND `customer_phone_normalized` LIKE '58%')
  OR (length(`customer_phone_normalized`) = 10 AND `customer_phone_normalized` LIKE '4%');
--> statement-breakpoint
-- Repair leftover auto_full pauses. Do not bump updated_at (verify fallback orders by it).
UPDATE `raffles`
SET
  `status` = 'finished',
  `pause_until` = NULL,
  `pause_reason` = NULL
WHERE `status` = 'paused'
  AND `pause_reason` = 'auto_full'
  AND `tickets_available` <= 0;
--> statement-breakpoint
-- Reactivate auto_full-with-stock only when it would not create a second public campaign.
UPDATE `raffles`
SET
  `status` = 'active',
  `pause_until` = NULL,
  `pause_reason` = NULL
WHERE `id` IN (
  SELECT `id` FROM (
    SELECT `id` FROM `raffles`
    WHERE `status` = 'paused'
      AND `pause_reason` = 'auto_full'
      AND `tickets_available` > 0
      AND NOT EXISTS (
        SELECT 1 FROM `raffles` AS `other`
        WHERE `other`.`id` != `raffles`.`id`
          AND `other`.`status` IN ('active', 'paused')
      )
  )
);
--> statement-breakpoint
-- Leftover auto_full with stock that we did not reactivate: drop the timer so cron cannot unpause it.
UPDATE `raffles`
SET `pause_until` = NULL
WHERE `status` = 'paused'
  AND `pause_reason` = 'auto_full'
  AND `tickets_available` > 0;
