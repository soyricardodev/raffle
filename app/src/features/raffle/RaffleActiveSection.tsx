import { HowToPlayCloud } from "@/features/raffle/HowToPlayCloud"
import { shouldShowHowToPlayCloud } from "@/features/raffle/how-to-play"
import { PromotionBanner } from "@/features/raffle/PromotionBanner"
import { RaffleCoverHero } from "@/features/raffle/RaffleCoverHero"
import { RaffleInfoPanel } from "@/features/raffle/RaffleInfoPanel"
import {
  type RaffleLandingRaffle,
  raffleTicketsInput,
} from "@/features/raffle/raffle-landing-types"

type RaffleActiveSectionProps = {
  raffle: RaffleLandingRaffle
  liveEnabled?: boolean
  edgeBleed?: boolean
  headingLevel?: 1 | 2
  descriptionLineClamp?: number | false
  children?: React.ReactNode
}

export function RaffleActiveSection({
  raffle,
  liveEnabled = true,
  edgeBleed = false,
  headingLevel = 1,
  descriptionLineClamp = 5,
  children,
}: RaffleActiveSectionProps) {
  const tickets = raffleTicketsInput(raffle)
  const hasCover = Boolean(raffle.image_url)
  const showHowToPlay = shouldShowHowToPlayCloud(raffle.status)

  return (
    <div className="space-y-3 sm:space-y-4">
      {hasCover ? (
        <RaffleCoverHero
          raffleId={raffle.id}
          imageUrl={raffle.image_url!}
          imageAlt={raffle.name}
          status={raffle.status}
          tickets={tickets}
          liveEnabled={liveEnabled}
          edgeBleed={edgeBleed}
        />
      ) : null}

      {showHowToPlay ? <HowToPlayCloud /> : null}

      {raffle.pricing ? (
        <PromotionBanner pricing={raffle.pricing} paymentMethods={raffle.payment_methods ?? []} />
      ) : null}

      <RaffleInfoPanel
        raffleId={raffle.id}
        name={raffle.name}
        description={raffle.description}
        status={raffle.status}
        tickets={tickets}
        drawDate={raffle.draw_date}
        daysRemaining={raffle.days_remaining}
        priceBs={raffle.price_bs}
        priceUsd={raffle.price_usd}
        pricing={raffle.pricing}
        liveEnabled={liveEnabled}
        showProgress={!hasCover}
        showStatusBadge={!hasCover}
        headingLevel={headingLevel}
        descriptionLineClamp={descriptionLineClamp}
      />

      {children}
    </div>
  )
}
