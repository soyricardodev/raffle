import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { adminFetch } from "@/lib/admin-fetch"

type MaintenanceResult = {
  success: boolean
  paused: {
    success: boolean
    processed: number
    reactivated: number
    finished: number
  }
  finalized: {
    finalized: number
  }
}

export function AdminMaintenanceSection() {
  const [lastResult, setLastResult] = useState<MaintenanceResult | null>(null)
  const [confirmRun, setConfirmRun] = useState(false)

  const runMutation = useMutation({
    mutationFn: () =>
      adminFetch<MaintenanceResult>("/api/admin/maintenance", { method: "POST" }),
    onSuccess: (result) => {
      setLastResult(result)
      setConfirmRun(false)
      toast.success("Mantenimiento ejecutado")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mantenimiento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Procesa pausas vencidas y finaliza rifas cuyo sorteo ya pasó. Ejecutar solo cuando sea
          necesario.
        </p>
        <Button
          variant="outline"
          className="min-h-11 w-full sm:w-auto"
          disabled={runMutation.isPending}
          onClick={() => setConfirmRun(true)}
        >
          <Wrench className="mr-2 size-4" />
          {runMutation.isPending ? "Ejecutando…" : "Ejecutar mantenimiento"}
        </Button>
        {lastResult ? (
          <div className="bg-muted flex flex-col gap-2 rounded-xl p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Pausas procesadas:</span>{" "}
              <span className="font-medium tabular-nums">{lastResult.paused.processed}</span>
              {" "}
              (reactivadas: {lastResult.paused.reactivated}, finalizadas:{" "}
              {lastResult.paused.finished})
            </p>
            <p>
              <span className="text-muted-foreground">Rifas finalizadas:</span>{" "}
              <span className="font-medium tabular-nums">{lastResult.finalized.finalized}</span>
            </p>
          </div>
        ) : null}
      </CardContent>

      <ConfirmAction
        open={confirmRun}
        onOpenChange={setConfirmRun}
        title="Ejecutar mantenimiento"
        description="Se procesarán pausas vencidas y rifas con sorteo pasado. ¿Continuar?"
        confirmLabel="Ejecutar"
        pending={runMutation.isPending}
        onConfirm={() => runMutation.mutate()}
      />
    </Card>
  )
}
