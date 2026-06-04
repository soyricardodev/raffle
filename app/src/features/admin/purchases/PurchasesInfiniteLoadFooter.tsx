import { CircleNotchIcon } from "@phosphor-icons/react"
import type { RefObject } from "react"
import { Button } from "@/components/ui/button"

type PurchasesInfiniteLoadFooterProps = {
  loadedCount: number
  total: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetching: boolean
  onLoadMore: () => void
  sentinelRef: RefObject<HTMLDivElement | null>
}

function footerStatusMessage({
  loadedCount,
  total,
  hasNextPage,
  isFetchingNextPage,
}: Pick<
  PurchasesInfiniteLoadFooterProps,
  "loadedCount" | "total" | "hasNextPage" | "isFetchingNextPage"
>) {
  if (isFetchingNextPage) {
    return `Cargando más compras. Mostrando ${loadedCount.toLocaleString("es-VE")} de ${total.toLocaleString("es-VE")}.`
  }
  if (hasNextPage) {
    return `Mostrando ${loadedCount.toLocaleString("es-VE")} de ${total.toLocaleString("es-VE")}. Hay más resultados disponibles.`
  }
  if (loadedCount === 0) return "No hay compras para mostrar."
  return `Mostrando todas las ${loadedCount.toLocaleString("es-VE")} compras del filtro.`
}

export function PurchasesInfiniteLoadFooter({
  loadedCount,
  total,
  hasNextPage,
  isFetchingNextPage,
  isFetching,
  onLoadMore,
  sentinelRef,
}: PurchasesInfiniteLoadFooterProps) {
  const statusMessage = footerStatusMessage({
    loadedCount,
    total,
    hasNextPage,
    isFetchingNextPage,
  })

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="text-muted-foreground tabular-nums"
      >
        {statusMessage}
        {isFetching && !isFetchingNextPage ? (
          <span className="text-muted-foreground/80"> · Actualizando…</span>
        ) : null}
      </div>

      {hasNextPage ? (
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full max-w-xs sm:w-auto"
            disabled={isFetchingNextPage || isFetching}
            onClick={onLoadMore}
          >
            {isFetchingNextPage ? (
              <>
                <CircleNotchIcon data-icon="inline-start" className="animate-spin" />
                Cargando más…
              </>
            ) : (
              "Cargar más"
            )}
          </Button>
          <div ref={sentinelRef} className="h-px w-full" aria-hidden />
        </div>
      ) : loadedCount > 0 ? (
        <p className="text-center text-xs text-muted-foreground">No hay más compras en este filtro.</p>
      ) : null}
    </div>
  )
}
