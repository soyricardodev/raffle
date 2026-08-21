import { EyeIcon, EyeSlashIcon, LockSimpleIcon } from "@phosphor-icons/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type FormEvent, type ReactNode, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { adminNavTitle } from "@/features/admin/nav"
import {
  adminPurchasesAccessQueryKey,
  type PurchasesAccessStatus,
  unlockPurchasesAccessFn,
} from "@/features/admin/purchases/admin-purchases-access-queries"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { getApiErrorMessage } from "@/lib/api-error-message"

type PurchasesAccessGateProps = {
  status: PurchasesAccessStatus | undefined
  isPending: boolean
  isError: boolean
  onRetry: () => void
  children: ReactNode
}

export function PurchasesAccessGate({
  status,
  isPending,
  isError,
  onRetry,
  children,
}: PurchasesAccessGateProps) {
  if (isPending) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 pt-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <AdminPageHeader title={adminNavTitle("/admin/compras")} />
        <Card>
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-destructive text-sm">No se pudo verificar el acceso al módulo.</p>
            <Button className="min-h-11 w-fit" onClick={onRetry}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status?.required && !status.unlocked) {
    return <PurchasesAccessUnlockForm />
  }

  return children
}

function PurchasesAccessUnlockForm() {
  const queryClient = useQueryClient()
  const [key, setKey] = useState("")
  const [showKey, setShowKey] = useState(false)

  const unlockMutation = useMutation({
    mutationFn: () => unlockPurchasesAccessFn({ data: { key } }),
    onSuccess: (next) => {
      queryClient.setQueryData(adminPurchasesAccessQueryKey, next)
    },
    onError: (error: Error) => {
      toast.error(getApiErrorMessage(error))
    },
  })

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!key.trim() || unlockMutation.isPending) return
    unlockMutation.mutate()
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 pt-2">
      <AdminPageHeader
        title={adminNavTitle("/admin/compras")}
        description="Este módulo pide una clave extra para entrar."
      />
      <Card className="purchases-access-card border-border/80 shadow-md">
        <CardHeader className="space-y-2 text-center">
          <div className="bg-muted mx-auto flex size-11 items-center justify-center rounded-full">
            <LockSimpleIcon className="text-muted-foreground size-5" weight="duotone" />
          </div>
          <CardTitle className="font-heading text-xl">Clave de acceso</CardTitle>
          <CardDescription>Escríbela para ver y gestionar las compras.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="purchases-access-key">Clave administrativa</Label>
              <div className="relative">
                <Input
                  id="purchases-access-key"
                  className="min-h-11 pr-10"
                  type={showKey ? "text" : "password"}
                  autoComplete="off"
                  autoFocus
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  disabled={unlockMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
                  onClick={() => setShowKey((visible) => !visible)}
                  disabled={unlockMutation.isPending}
                  aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                >
                  {showKey ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </Button>
              </div>
            </div>
            <Button
              className="min-h-11 w-full"
              type="submit"
              disabled={!key.trim() || unlockMutation.isPending}
            >
              {unlockMutation.isPending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
