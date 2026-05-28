import { Link } from "@tanstack/react-router"
import { Eye, Pause, PencilSimple, Play } from "@phosphor-icons/react"
import { useState } from "react"
import type { RaffleRow } from "@/features/admin/raffles/types"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"

type RaffleRowActionsProps = {
  raffle: RaffleRow
  pending: boolean
  onAction: (action: "pause" | "unpause" | "publish") => void
  density?: "compact" | "comfortable"
}

export function RaffleRowActions({
  raffle,
  pending,
  onAction,
  density = "comfortable",
}: RaffleRowActionsProps) {
  const [confirm, setConfirm] = useState<
    "pause" | "unpause" | "publish" | null
  >(null)
  const buttonSize = density === "compact" ? "icon-xs" : "icon-sm"
  const buttonClassName = density === "compact" ? undefined : "size-11"

  return (
    <>
      <div className="flex flex-wrap gap-1">
        <Button
          asChild
          size={buttonSize}
          variant="outline"
          className={buttonClassName}
          title="Ver administración"
        >
          <Link to="/admin/rifas/$id" params={{ id: String(raffle.id) }}>
            <Eye />
          </Link>
        </Button>
        <Button
          asChild
          size={buttonSize}
          variant="outline"
          className={buttonClassName}
          title="Editar"
        >
          <Link to="/admin/edit/$id" params={{ id: String(raffle.id) }}>
            <PencilSimple />
          </Link>
        </Button>
        {raffle.status === "active" && (
          <Button
            size={buttonSize}
            variant="outline"
            className={buttonClassName}
            disabled={pending}
            onClick={() => setConfirm("pause")}
            title="Pausar"
          >
            <Pause />
          </Button>
        )}
        {raffle.status === "paused" && (
          <Button
            size={buttonSize}
            variant="outline"
            className={buttonClassName}
            disabled={pending}
            onClick={() => setConfirm("unpause")}
            title="Reanudar"
          >
            <Play />
          </Button>
        )}
        {raffle.status === "finished" && !raffle.publish && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={() => setConfirm("publish")}
          >
            Publicar
          </Button>
        )}
      </div>

      <ConfirmAction
        open={confirm === "pause"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Pausar rifa"
        description={`¿Pausar "${raffle.name}"? No se aceptarán nuevas compras hasta reanudar.`}
        confirmLabel="Pausar"
        pending={pending}
        onConfirm={() => {
          onAction("pause")
          setConfirm(null)
        }}
      />

      <ConfirmAction
        open={confirm === "unpause"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Reanudar rifa"
        description={`¿Reanudar "${raffle.name}"? Las compras volverán a estar disponibles.`}
        confirmLabel="Reanudar"
        pending={pending}
        onConfirm={() => {
          onAction("unpause")
          setConfirm(null)
        }}
      />

      <ConfirmAction
        open={confirm === "publish"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Publicar resultados"
        description={`¿Publicar los resultados de "${raffle.name}" en la página pública?`}
        confirmLabel="Publicar"
        pending={pending}
        onConfirm={() => {
          onAction("publish")
          setConfirm(null)
        }}
      />
    </>
  )
}
