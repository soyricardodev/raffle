import { DotsThreeVertical, SlidersHorizontal } from "@phosphor-icons/react"
import type { TransitionRaffleInput } from "@raffle/shared/validators"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { adminRaffleHubLink } from "@/features/admin/raffles/admin-raffle-hub"
import {
  getConfirmCopy,
  getPrimaryLifecycleActions,
} from "@/features/admin/raffles/raffle-lifecycle-ui"
import type { RaffleRow } from "@/features/admin/raffles/types"

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
  const [pendingRequest, setPendingRequest] = useState<TransitionRaffleInput | null>(null)
  const buttonSize = density === "compact" ? "icon-xs" : "sm"
  const manageLabel = "Gestionar rifa"

  const published = Boolean(raffle.publish)
  const menuActions = getPrimaryLifecycleActions(raffle.status, published)
  const confirmCopy = pendingRequest ? getConfirmCopy(pendingRequest, raffle.name) : null

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          asChild
          size={buttonSize}
          variant="outline"
          className={density === "comfortable" ? "min-h-11" : undefined}
          title={manageLabel}
        >
          <Link {...adminRaffleHubLink(raffle.id)} aria-label={manageLabel}>
            <SlidersHorizontal data-icon="inline-start" />
            {density === "comfortable" ? "Gestionar" : null}
          </Link>
        </Button>
        {menuActions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size={density === "compact" ? "icon-xs" : "icon-sm"}
                variant="outline"
                className={density === "comfortable" ? "size-11" : undefined}
                disabled={pending}
                title="Cambiar estado"
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
