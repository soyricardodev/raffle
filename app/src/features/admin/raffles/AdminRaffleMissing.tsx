import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"

export function AdminRaffleMissing({ raffleId }: { raffleId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="text-lg font-medium">Rifa no encontrada</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        No hay ninguna rifa con el id <span className="font-mono font-medium">{raffleId}</span>.
      </p>
      <Button asChild variant="outline" className="min-h-11">
        <Link to="/admin/rifas">Volver a mis rifas</Link>
      </Button>
    </div>
  )
}
