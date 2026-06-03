import {
  type PublicRecentPurchase,
  toPublicRecentPurchase,
} from "@raffle/shared/public-recent-purchase"
import * as buyerPresenceRepo from "./repositories/buyer-presence.repository"
import * as purchasesRepo from "./repositories/purchases.repository"

export type { PublicRecentPurchase }

export type RaffleLiveActivity = {
  activeBuyersCount: number
  recentPurchases: PublicRecentPurchase[]
}

export async function getRaffleLiveActivity(raffleId: number): Promise<RaffleLiveActivity> {
  const [activeBuyersCount, rows] = await Promise.all([
    buyerPresenceRepo.countActiveBuyers(raffleId),
    purchasesRepo.listRecentPurchaseRows(raffleId),
  ])

  return {
    activeBuyersCount,
    recentPurchases: rows.map(toPublicRecentPurchase),
  }
}

export async function recordBuyerPresence(raffleId: number, clientId: string): Promise<void> {
  const trimmed = clientId.trim()
  if (!trimmed || trimmed.length > 64) return

  await buyerPresenceRepo.upsertBuyerPresence(raffleId, trimmed)
  await buyerPresenceRepo.pruneExpiredBuyerPresenceForRaffle(raffleId)
}
