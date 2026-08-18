import { PAYMENT_METHOD_DEFINITIONS, summarizeAccountInfo } from "@raffle/shared/payment-methods"
import { ChevronDown, ChevronUp, Pencil, Trash } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminPaymentAccount } from "@/features/admin/payment-methods/types"

type PaymentAccountCardProps = {
  account: AdminPaymentAccount
  index: number
  isFirst: boolean
  isLast: boolean
  reorderPending: boolean
  onMove: (delta: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
}

export function PaymentAccountCard({
  account,
  index,
  isFirst,
  isLast,
  reorderPending,
  onMove,
  onEdit,
  onDelete,
}: PaymentAccountCardProps) {
  const def = PAYMENT_METHOD_DEFINITIONS[account.method_type]

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex shrink-0 flex-col items-center">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={`Subir ${account.label}`}
              disabled={isFirst || reorderPending}
              onClick={() => onMove(-1)}
            >
              <ChevronUp className="size-4" />
            </Button>
            <span className="text-muted-foreground py-0.5 text-xs font-semibold tabular-nums">
              {index + 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label={`Bajar ${account.label}`}
              disabled={isLast || reorderPending}
              onClick={() => onMove(1)}
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">{account.label}</CardTitle>
            <CardDescription className="truncate">
              {summarizeAccountInfo(account.method_type, account.account_info)}
            </CardDescription>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Editar"
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            aria-label="Eliminar"
            onClick={onDelete}
          >
            <Trash className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 pt-0">
        <Badge variant="secondary">{def.label}</Badge>
        <Badge variant="outline">{def.currency === "USD" ? "USD" : "Bs"}</Badge>
        {!account.is_active ? <Badge variant="outline">Inactivo</Badge> : null}
      </CardContent>
    </Card>
  )
}
