import { Plus } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { summarizeActivePromotion } from "@/features/admin/raffles/promotion-form-utils"
import type { RafflePricing } from "@/features/raffle/promotion-types"

type RafflePromotionsPanelProps = {
  pricing: RafflePricing
  priceBs: number | string
  priceUsd: number | string
  onCreate: () => void
  onManage: () => void
}

export function RafflePromotionsPanel({
  pricing,
  priceBs,
  priceUsd,
  onCreate,
  onManage,
}: RafflePromotionsPanelProps) {
  const summary = summarizeActivePromotion(pricing, Number(priceBs), Number(priceUsd))

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Promociones</CardTitle>
          <CardDescription>Descuentos de precio para esta rifa.</CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 shrink-0"
          onClick={onCreate}
        >
          <Plus data-icon="inline-start" />
          Nueva
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {summary.hasActive ? (
          <>
            <div>
              <p className="font-medium">{summary.title}</p>
              <p className="text-muted-foreground mt-1 text-sm tabular-nums">{summary.priceHint}</p>
            </div>
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onManage}>
              Gestionar
            </Button>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">{summary.priceHint}</p>
            <Button type="button" variant="outline" className="min-h-11 w-full" onClick={onManage}>
              Ver todas
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
