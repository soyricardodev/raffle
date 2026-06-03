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

type PurchaseEmailsSectionProps = {
  purchase: PurchaseDetail
}

export function PurchaseEmailsSection({ purchase }: PurchaseEmailsSectionProps) {
  const queryClient = useQueryClient()
  const [confirmSend, setConfirmSend] = useState<"confirmation" | "status" | null>(null)

  const emailsQuery = useQuery(adminPurchaseEmailsQueryOptions(purchase.id))
  const logs = emailsQuery.data?.data ?? []
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
    <div className="rounded-xl border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
          <EnvelopeSimpleIcon className="size-3.5" />
          Correos
        </p>
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasEmail || sendMutation.isPending}
            onClick={() => setConfirmSend("confirmation")}
          >
            Enviar confirmación
          </Button>
          {(purchase.status === "approved" || purchase.status === "rejected") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasEmail || sendMutation.isPending}
              onClick={() => setConfirmSend("status")}
            >
              Enviar estado
            </Button>
          )}
          <Link
            to="/admin/emails"
            search={{ purchase: purchase.id }}
            className="inline-flex h-8 items-center rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Ver todos
          </Link>
        </div>
      </div>

      {!hasEmail ? (
        <p className="text-muted-foreground text-xs">El cliente no tiene correo registrado.</p>
      ) : emailsQuery.isLoading ? (
        <Skeleton className="h-16 w-full rounded-lg" />
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground text-xs">Sin envíos registrados para esta compra.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {logs.slice(0, 3).map((log) => (
            <li
              key={log.id}
              className="flex items-start justify-between gap-2 rounded-lg bg-muted/30 px-2 py-1.5 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{emailTypeLabel(log.email_type)}</p>
                <p className="text-muted-foreground truncate">{log.subject}</p>
                <p className="text-muted-foreground tabular-nums">
                  {formatDateTime(String(log.sent_at ?? log.created_at))}
                </p>
                {log.error_message ? (
                  <p className="text-red-600 dark:text-red-400 mt-0.5 line-clamp-2">
                    {log.error_message}
                  </p>
                ) : null}
              </div>
              <EmailStatusBadge status={log.status} className="shrink-0" />
            </li>
          ))}
        </ul>
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
