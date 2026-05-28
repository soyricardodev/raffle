import { Link } from "@tanstack/react-router"
import { DotsThreeVertical, Eye, PencilSimple } from "@phosphor-icons/react"
import { useState } from "react"
import type { RaffleRow } from "@/features/admin/raffles/types"
import {
  getConfirmCopy,
  getPrimaryLifecycleActions,
} from "@/features/admin/raffles/raffle-lifecycle-ui"
import type { TransitionRaffleInput } from "@raffle/shared/validators"
import { Button } from "@/components/ui/button"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type RaffleRowActionsProps = {
  raffle: RaffleRow
  pending: boolean
  onLifecycle: (request: TransitionRaffleInput) => void
  density?: "compact" | "comfortable"
}

export function RaffleRowActions({
  raffle,
  pending,
  onLifecycle,
  density = "comfortable",
}: RaffleRowActionsProps) {
  const [pendingRequest, setPendingRequest] = useState<TransitionRaffleInput | null>(
    null,
  )
  const buttonSize = density === "compact" ? "icon-xs" : "icon-sm"
  const buttonClassName = density === "compact" ? undefined : "size-11"

  const published = Boolean(raffle.publish)
  const menuActions = getPrimaryLifecycleActions(raffle.status, published)
  const confirmCopy = pendingRequest
    ? getConfirmCopy(pendingRequest, raffle.name)
    : null

  return (
    <>
      <div className="flex items-center gap-1">
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
        {menuActions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size={buttonSize}
                variant="outline"
                className={buttonClassName}
                disabled={pending}
                title="Acciones de estado"
              >
                <DotsThreeVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {menuActions.map((action) => {
                const Icon = action.icon
                return (
                  <DropdownMenuItem
                    key={action.id}
                    variant={action.variant === "destructive" ? "destructive" : "default"}
                    onSelect={() => setPendingRequest(action.request)}
                  >
                    <Icon className="size-4" />
                    {action.label}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin/rifas/$id" params={{ id: String(raffle.id) }}>
                  Gestionar ciclo completo…
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {confirmCopy ? (
        <ConfirmAction
          open={pendingRequest !== null}
          onOpenChange={(open) => !open && setPendingRequest(null)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          destructive={confirmCopy.destructive}
          pending={pending}
          onConfirm={() => {
            if (pendingRequest) onLifecycle(pendingRequest)
            setPendingRequest(null)
          }}
        />
      ) : null}
    </>
  )
}
