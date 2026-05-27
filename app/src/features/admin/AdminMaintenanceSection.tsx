import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adminFetch } from "@/lib/admin-fetch"
import { Wrench } from "lucide-react"

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

  const runMutation = useMutation({
    mutationFn: () =>
      adminFetch<MaintenanceResult>("/api/admin/maintenance", { method: "POST" }),
    onSuccess: (result) => {
      setLastResult(result)
      toast.success("Mantenimiento ejecutado")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mantenimiento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Procesa pausas vencidas y finaliza rifas cuyo sorteo ya pasó.
        </p>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={runMutation.isPending}
          onClick={() => runMutation.mutate()}
        >
          <Wrench className="mr-2 size-4" />
          {runMutation.isPending ? "Ejecutando…" : "Ejecutar mantenimiento"}
        </Button>
        {lastResult && (
          <div className="bg-muted space-y-2 rounded-lg p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Pausas procesadas:</span>{" "}
              {lastResult.paused.processed} (reactivadas: {lastResult.paused.reactivated},
              finalizadas: {lastResult.paused.finished})
            </p>
            <p>
              <span className="text-muted-foreground">Rifas finalizadas:</span>{" "}
              {lastResult.finalized.finalized}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
