export {
  formatPublicBuyerName,
  formatRecentPurchaseMessage,
  formatRecentPurchaseMessageCompact,
  type PublicRecentPurchase,
  type PublicRecentPurchaseStatus,
} from "@raffle/shared/public-recent-purchase"

/** @deprecated Use `PublicRecentPurchase` from `@raffle/shared/public-recent-purchase`. */
export type PublicPurchaseActivityItem = Pick<
  import("@raffle/shared/public-recent-purchase").PublicRecentPurchase,
  "displayName" | "ticketQuantity" | "status"
>
