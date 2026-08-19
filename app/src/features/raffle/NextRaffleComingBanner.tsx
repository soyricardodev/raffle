import { Ticket } from "lucide-react"
import { useFinishedRaffleTopBanners } from "@/features/raffle/use-finished-raffle-top-banners"

export function NextRaffleComingBanner() {
  const { visible } = useFinishedRaffleTopBanners()

  if (!visible) return null

  return (
    <section
      role="status"
      aria-label="Aviso: puedes registrar el comprobante en la próxima liberación"
      data-testid="next-raffle-coming-banner"
      className="bg-red-600 text-white"
    >
      <div className="mx-auto flex max-w-lg items-start gap-2 px-3 py-2 sm:px-4">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Ticket className="size-4" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-xs font-medium leading-snug sm:text-[13px]">
          Si no lograste registrar tu comprobante a tiempo, mantén la calma, lo
          puedes registrar en la próxima liberación.
        </p>
      </div>
    </section>
  )
}
