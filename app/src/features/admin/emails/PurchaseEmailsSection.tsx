import { EnvelopeSimpleIcon } from "@phosphor-icons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { adminPurchaseEmailsQueryOptions } from "@/features/admin/emails/admin-emails-queries"
import { emailTypeLabel } from "@/features/admin/emails/email-labels"
import { EmailStatusBadge } from "@/features/admin/emails/EmailStatusBadge"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import type { PurchaseDetail } from "@/features/admin/purchases/types"
import { adminFetch } from "@/lib/admin-fetch"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

type PurchaseEmailsSectionProps = {
  purchase: PurchaseDetail
  className?: string
}

export function PurchaseEmailsSection({ purchase, className }: PurchaseEmailsSectionProps) {
  const queryClient = useQueryClient()
  const [confirmSend, setConfirmSend] = useState<"confirmation" | "status" | null>(null)

  const emailsQuery = useQuery(adminPurchaseEmailsQueryOptions(purchase.id))
  const logs = emailsQuery.data?.data ?? []
  const lastLog = logs[0]
  const hasEmail = Boolean(purchase.customer_email?.trim())

  const sendMutation = useMutation({
    mutationFn: async (payload: {
      type: "purchase_confirmation" | "status_update"
      status?: "approved" | "rejected"
    }) => {
      return adminFetch(`/api/admin/purchases/${purchase.id}/emails/send`, {
        method: "POST",
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast.success("Correo enviado")
      setConfirmSend(null)
      void queryClient.invalidateQueries({ queryKey: ["admin", "emails"] })
      void queryClient.invalidateQueries({
        queryKey: ["admin", "emails", "purchase", purchase.id],
      })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className={cn("rounded-lg border px-2 py-1.5", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="flex shrink-0 items-center gap-1 text-[11px] font-medium uppercase text-muted-foreground">
          <EnvelopeSimpleIcon className="size-3" />
          Correos
        </p>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!hasEmail || sendMutation.isPending}
            onClick={() => setConfirmSend("confirmation")}
          >
            Confirmación
          </Button>
          {(purchase.status === "approved" || purchase.status === "rejected") && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={!hasEmail || sendMutation.isPending}
              onClick={() => setConfirmSend("status")}
            >
              Estado
            </Button>
          )}
          <Link
            to="/admin/emails"
            search={{ purchase: purchase.id }}
            className="inline-flex h-6 items-center rounded-lg px-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Ver todos
          </Link>
        </div>
      </div>

      {!hasEmail ? (
        <p className="text-muted-foreground mt-1 text-[11px]">Sin correo del cliente.</p>
      ) : emailsQuery.isLoading ? (
        <Skeleton className="mt-1 h-5 w-full rounded" />
      ) : !lastLog ? (
        <p className="text-muted-foreground mt-1 text-[11px]">Sin envíos registrados.</p>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-2 rounded bg-muted/30 px-1.5 py-0.5 text-[11px]">
          <span className="min-w-0 truncate">
            <span className="font-medium">{emailTypeLabel(lastLog.email_type)}</span>
            <span className="text-muted-foreground">
              {" · "}
              {formatDateTime(String(lastLog.sent_at ?? lastLog.created_at))}
            </span>
            {logs.length > 1 ? (
              <span className="text-muted-foreground"> (+{logs.length - 1})</span>
            ) : null}
          </span>
          <EmailStatusBadge status={lastLog.status} className="shrink-0 scale-90" />
        </div>
      )}

      <ConfirmAction
        open={confirmSend === "confirmation"}
        onOpenChange={(o) => !o && setConfirmSend(null)}
        title="Enviar confirmación"
        description={`¿Enviar correo de confirmación a ${purchase.customer_email}?`}
        confirmLabel="Enviar"
        pending={sendMutation.isPending}
        onConfirm={() => sendMutation.mutate({ type: "purchase_confirmation" })}
      />

      <ConfirmAction
        open={confirmSend === "status"}
        onOpenChange={(o) => !o && setConfirmSend(null)}
        title="Enviar estado"
        description={`¿Enviar correo de estado (${purchase.status}) a ${purchase.customer_email}?`}
        confirmLabel="Enviar"
        pending={sendMutation.isPending}
        onConfirm={() =>
          sendMutation.mutate({
            type: "status_update",
            status: purchase.status === "approved" ? "approved" : "rejected",
          })
        }
      />
    </div>
  )
}
