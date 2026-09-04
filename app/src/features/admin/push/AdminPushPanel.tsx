import { ArrowClockwiseIcon, BellIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { adminNavTitle } from "@/features/admin/nav"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { AdminPushAutoAlerts } from "@/features/admin/push/AdminPushAutoAlerts"
import { AdminPushPlanCard } from "@/features/admin/push/AdminPushPlan"
import {
  type AdminPushSendResult,
  type AdminPushSubscriber,
  adminPushQueryKeys,
  adminPushQueryOptions,
} from "@/features/admin/push/admin-push-queries"
import {
  formatPushLastSeen,
  subscriberInitials,
} from "@/features/admin/push/push-subscriber-format"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { PWA_ICON_192, PWA_NAME } from "@/features/pwa/pwa-brand"
import { adminFetch } from "@/lib/admin-fetch"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const TITLE_MAX = 80
const BODY_MAX = 180
const SKELETON_ROWS = ["one", "two", "three", "four"] as const

function remainingLabel(used: number, max: number) {
  const left = Math.max(0, max - used)
  return `${left} caracter${left === 1 ? "" : "es"}`
}

function PushSubscriberList({
  loading,
  subscribers,
}: {
  loading: boolean
  subscribers: AdminPushSubscriber[]
}) {
  const namedCount = subscribers.filter((row) => row.displayName).length

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="flex items-baseline justify-between gap-3 px-4 py-2.5">
        <p className="text-sm font-medium">
          {loading
            ? "Cargando…"
            : subscribers.length === 1
              ? "1 aviso"
              : `${subscribers.length.toLocaleString("es-VE")} avisos`}
        </p>
        {!loading && namedCount > 0 ? (
          <p className="text-muted-foreground text-xs tabular-nums">
            {namedCount === 1 ? "1 con nombre" : `${namedCount.toLocaleString("es-VE")} con nombre`}
          </p>
        ) : null}
      </div>
      {loading ? (
        <ul className="divide-border divide-y border-t">
          {SKELETON_ROWS.map((id) => (
            <li key={id} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-12" />
                </span>
                <Skeleton className="mt-2 h-3 w-20" />
              </span>
            </li>
          ))}
        </ul>
      ) : subscribers.length ? (
        <ul className="divide-border divide-y border-t">
          {subscribers.map((row) => (
            <PushSubscriberRow key={row.id} row={row} />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground border-t px-4 py-8 text-center text-sm">
          Cuando alguien active avisos, aparece aquí.
        </p>
      )}
    </div>
  )
}

function PushSubscriberRow({ row }: { row: AdminPushSubscriber }) {
  const named = Boolean(row.displayName)
  const title = row.displayName || row.device
  const initials = named ? subscriberInitials(title) : ""

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          named ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
        aria-hidden
      >
        {named && initials ? initials : <BellIcon className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              "truncate text-sm",
              named ? "font-medium" : "text-muted-foreground font-medium",
            )}
          >
            {title}
          </span>
          <time
            className="text-muted-foreground shrink-0 text-[11px] tabular-nums"
            dateTime={row.lastSeenAt}
            title={formatDateTime(row.lastSeenAt)}
          >
            {formatPushLastSeen(row.lastSeenAt)}
          </time>
        </span>
        {named ? (
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">{row.device}</span>
        ) : null}
      </span>
    </li>
  )
}

export function AdminPushPanel() {
  const queryClient = useQueryClient()
  const listQuery = useQuery({
    ...adminPushQueryOptions(),
    refetchOnMount: false,
  })

  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const count = listQuery.data?.count ?? 0
  const enabled = listQuery.data?.enabled ?? false
  const trimmedTitle = title.trim()
  const trimmedBody = body.trim()
  const canSend = enabled && count > 0 && trimmedTitle.length > 0 && trimmedBody.length > 0
  const showPreview = trimmedTitle.length > 0 || trimmedBody.length > 0

  const send = useMutation({
    mutationFn: () =>
      adminFetch<AdminPushSendResult>("/api/admin/push", {
        method: "POST",
        body: JSON.stringify({ title: trimmedTitle, body: trimmedBody }),
      }),
    onSuccess: (result) => {
      setConfirmOpen(false)
      setTitle("")
      setBody("")
      toast.success(
        result.sent === 1
          ? "Aviso enviado a 1 teléfono"
          : `Aviso enviado a ${result.sent.toLocaleString("es-VE")} teléfonos`,
      )
      if (result.removed > 0) {
        toast.message(
          `Se quitaron ${result.removed.toLocaleString("es-VE")} avisos que ya no sirven`,
        )
      }
      void queryClient.invalidateQueries({ queryKey: adminPushQueryKeys.list })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className="flex flex-col gap-4">
      <AdminPageHeader
        title={adminNavTitle("/admin/avisos")}
        description="Qué avisos de la rifa ya salieron, cuáles faltan, y uno tuyo cuando haga falta."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={listQuery.isFetching}
            onClick={() => void listQuery.refetch()}
          >
            <ArrowClockwiseIcon
              data-icon="inline-start"
              className={listQuery.isFetching ? "animate-spin" : undefined}
            />
            Actualizar
          </Button>
        }
      />

      {!listQuery.isLoading && !enabled ? (
        <p className="text-muted-foreground rounded-2xl border px-4 py-3 text-sm">
          Faltan las claves VAPID en el servidor. La lista se ve, pero no se puede enviar.
        </p>
      ) : null}

      {listQuery.isError ? null : (
        <>
          <AdminPushAutoAlerts
            loading={listQuery.isLoading}
            alerts={listQuery.data?.autoAlerts}
          />
          <AdminPushPlanCard loading={listQuery.isLoading} plan={listQuery.data?.plan} />
        </>
      )}

      <Card size="sm">
        <CardContent className="flex flex-col gap-3 p-4">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="admin-push-title">Título</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {remainingLabel(title.length, TITLE_MAX)}
              </span>
            </div>
            <Input
              id="admin-push-title"
              className="mt-1.5"
              maxLength={TITLE_MAX}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nueva bendición liberada."
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="admin-push-body">Mensaje</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {remainingLabel(body.length, BODY_MAX)}
              </span>
            </div>
            <Textarea
              id="admin-push-body"
              className="mt-1.5 min-h-24"
              maxLength={BODY_MAX}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Entra ya por tus boletos."
            />
          </div>

          {showPreview ? (
            <div className="bg-muted/50 flex items-start gap-3 rounded-2xl px-3 py-3 transition-[opacity,transform] duration-[180ms] ease-[cubic-bezier(0.23,1,0.32,1)] @starting-style:scale-[0.97] @starting-style:opacity-0">
              <img
                src={PWA_ICON_192}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-[11px] font-medium">{PWA_NAME}</p>
                <p className="truncate text-sm font-semibold">
                  {trimmedTitle || "Título del aviso"}
                </p>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                  {trimmedBody || "El mensaje se ve aquí."}
                </p>
              </div>
            </div>
          ) : null}

          <Button
            className="min-h-11 w-full sm:w-auto"
            disabled={!canSend || send.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <PaperPlaneTiltIcon data-icon="inline-start" />
            {count === 0 ? "Nadie tiene avisos aún" : "Enviar a todos"}
          </Button>
        </CardContent>
      </Card>

      {listQuery.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border px-4 py-4">
          <p className="text-muted-foreground text-sm">No se pudo cargar la lista.</p>
          <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <PushSubscriberList
          loading={listQuery.isLoading}
          subscribers={listQuery.data?.subscribers ?? []}
        />
      )}

      <ConfirmAction
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Enviar este aviso"
        description={
          <span className="flex flex-col gap-2 text-left">
            <span className="bg-muted/70 rounded-xl px-3 py-2">
              <span className="text-foreground block font-medium">{trimmedTitle}</span>
              <span className="mt-0.5 block">{trimmedBody}</span>
            </span>
            <span>
              {count === 1
                ? "Le llega al teléfono que tiene avisos activados."
                : `Le llega a ${count.toLocaleString("es-VE")} teléfonos a la vez.`}
            </span>
          </span>
        }
        confirmLabel={send.isPending ? "Enviando…" : "Enviar"}
        pending={send.isPending}
        onConfirm={() => send.mutate()}
      />
    </div>
  )
}
