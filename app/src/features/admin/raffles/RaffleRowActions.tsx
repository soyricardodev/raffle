import { Link } from "@tanstack/react-router"
import { DotsThreeVertical, Eye, PencilSimple } from "@phosphor-icons/react"
import { useState } from "react"
import type { RaffleRow } from "@/features/admin/raffles/types"
import {
  getConfirmCopy,
  getPrimaryLifecycleActions,
  type LifecycleConfirm,
} from "@/features/admin/raffles/raffle-lifecycle-ui"
import type { RaffleStatus } from "@raffle/shared/validators"
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
  onLifecycle: (confirm: LifecycleConfirm) => void
  density?: "compact" | "comfortable"
}

export function RaffleRowActions({
  raffle,
  pending,
  onLifecycle,
  density = "comfortable",
}: RaffleRowActionsProps) {
  const [confirm, setConfirm] = useState<LifecycleConfirm | null>(null)
  const buttonSize = density === "compact" ? "icon-xs" : "icon-sm"
  const buttonClassName = density === "compact" ? undefined : "size-11"

  const published = Boolean(raffle.publish)
  const status = raffle.status as RaffleStatus
  const menuActions = getPrimaryLifecycleActions(status, published)
  const confirmCopy = confirm ? getConfirmCopy(confirm, raffle.name) : null

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
                    onSelect={() => setConfirm(action.confirm)}
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
          open={confirm !== null}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          destructive={confirmCopy.destructive}
          pending={pending}
          onConfirm={() => {
            if (confirm) onLifecycle(confirm)
            setConfirm(null)
          }}
        />
      ) : null}
    </>
  )
}
