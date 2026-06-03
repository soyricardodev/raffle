import { ArrowSquareOutIcon, ArrowsClockwiseIcon } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { adminEmailDetailQueryOptions } from "@/features/admin/emails/admin-emails-queries"
import { canResendEmailLog } from "@/features/admin/emails/email-log-actions"
import { emailTypeLabel } from "@/features/admin/emails/email-labels"
import { EmailStatusBadge } from "@/features/admin/emails/EmailStatusBadge"
import type { EmailLogRow } from "@/features/admin/emails/types"
import { formatDateTime } from "@/lib/format"
import type { ReactNode } from "react"

type EmailLogDetailSheetProps = {
  logId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestResend: (log: EmailLogRow) => void
  resendPending?: boolean
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  )
}

export function EmailLogDetailSheet({
  logId,
  open,
  onOpenChange,
  onRequestResend,
  resendPending = false,
}: EmailLogDetailSheetProps) {
  const detailQuery = useQuery({
    ...adminEmailDetailQueryOptions(logId ?? 0),
    enabled: open && logId != null && logId > 0,
  })

  const log = detailQuery.data

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">
            {log ? `Correo #${log.id}` : "Detalle del correo"}
          </SheetTitle>
          <SheetDescription className="sr-only">Detalle del envío</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {detailQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : log ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <EmailStatusBadge status={log.status} />
                {canResendEmailLog(log) ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resendPending}
                    onClick={() => onRequestResend(log)}
                  >
                    <ArrowsClockwiseIcon data-icon="inline-start" />
                    Reenviar
                  </Button>
                ) : null}
              </div>

              <DetailRow label="Tipo">{emailTypeLabel(log.email_type)}</DetailRow>
              <DetailRow label="Asunto">{log.subject}</DetailRow>
              <DetailRow label="Destinatario">
                <a href={`mailto:${log.recipient_email}`} className="text-primary hover:underline">
                  {log.recipient_email}
                </a>
              </DetailRow>
              {log.purchase_id ? (
                <DetailRow label="Compra">
                  <Link
                    to="/admin/compras"
                    search={{ purchase: log.purchase_id }}
                    className="text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    #{log.purchase_id}
                    <ArrowSquareOutIcon className="size-3.5" />
                  </Link>
                </DetailRow>
              ) : null}
              {log.customer_name ? <DetailRow label="Cliente">{log.customer_name}</DetailRow> : null}
              {log.customer_phone ? (
                <DetailRow label="Teléfono">{log.customer_phone}</DetailRow>
              ) : null}
              <DetailRow label="Creado">{formatDateTime(String(log.created_at))}</DetailRow>
              {log.sent_at ? (
                <DetailRow label="Enviado">{formatDateTime(String(log.sent_at))}</DetailRow>
              ) : null}
              <DetailRow label="Actualizado">
                {formatDateTime(String(log.updated_at))}
              </DetailRow>
              {log.resend_email_id ? (
                <DetailRow label="ID proveedor">
                  <code className="text-xs">{log.resend_email_id}</code>
                </DetailRow>
              ) : null}
              {log.idempotency_key ? (
                <DetailRow label="Idempotencia">
                  <code className="text-xs break-all">{log.idempotency_key}</code>
                </DetailRow>
              ) : null}
              {log.error_message ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200">Error</p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">{log.error_message}</p>
                </div>
              ) : null}
              {log.metadata && Object.keys(log.metadata).length > 0 ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
                    Metadata
                  </p>
                  <pre className="max-h-40 overflow-auto text-xs whitespace-pre-wrap">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No se encontró el registro.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
