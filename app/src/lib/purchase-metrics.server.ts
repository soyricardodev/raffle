import { getLogger } from "./logger"

const logger = getLogger()

export type PurchaseMetricEvent =
  | "purchase_attempt"
  | "purchase_success"
  | "purchase_failure"
  | "purchase_rate_limited"
  | "transaction_retry"
  | "ticket_allocation"

export function recordPurchaseMetric(
  event: PurchaseMetricEvent,
  fields: Record<string, string | number | boolean | undefined>,
): void {
  logger.info({ metric: event, ...fields }, `metrics:${event}`)
}

export function recordPurchaseTiming(
  operation: string,
  durationMs: number,
  fields?: Record<string, string | number | boolean | undefined>,
): void {
  logger.info(
    { metric: "purchase_timing", operation, durationMs, ...fields },
    `metrics:timing:${operation}`,
  )
}
