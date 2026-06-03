import type { ReactNode } from "react"
import { LivePurchaseActivityTicker } from "@/features/raffle/LivePurchaseActivityTicker"
import type { LivePurchaseActivityVariant } from "@/features/raffle/live-activity-ticker-config"
import { RaffleLiveProvider } from "@/features/raffle/raffle-live-context"

type PublicHomeShellProps = {
  tickerVariant: LivePurchaseActivityVariant | null
  raffleId?: string | number
  livePollEnabled?: boolean
  children: ReactNode
}

export function PublicHomeShell({
  tickerVariant,
  raffleId,
  livePollEnabled = false,
  children,
}: PublicHomeShellProps) {
  const ticker =
    tickerVariant != null ? (
      <LivePurchaseActivityTicker
        variant={tickerVariant}
        raffleId={tickerVariant === "live" ? raffleId : undefined}
      />
    ) : null

  if (livePollEnabled && raffleId != null) {
    return (
      <RaffleLiveProvider raffleId={raffleId} enabled>
        {ticker}
        {children}
      </RaffleLiveProvider>
    )
  }

  return (
    <>
      {ticker}
      {children}
    </>
  )
}
