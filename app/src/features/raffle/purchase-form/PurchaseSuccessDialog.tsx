import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { PurchaseResult } from "@/features/raffle/types"
import { Link } from "@tanstack/react-router"
import { Copy, PartyPopper } from "lucide-react"
import { toast } from "sonner"

type PurchaseSuccessDialogProps = {
  result: PurchaseResult | null
  onClose: () => void
}

export function PurchaseSuccessDialog({ result, onClose }: PurchaseSuccessDialogProps) {
  async function copyTickets() {
    if (!result) return
    await navigator.clipboard.writeText(result.ticketNumbers.join(", "))
    toast.success("Boletos copiados al portapapeles")
  }

  return (
    <Dialog open={result != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="bg-emerald-500/15 mx-auto mb-2 flex size-14 items-center justify-center rounded-full">
            <PartyPopper className="size-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-xl">¡Listo, compra registrada!</DialogTitle>
          <DialogDescription>
            Tus boletos quedaron reservados. Guárdalos y verifica el estado cuando sea aprobada.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-3">
            <div className="from-primary/10 to-primary/5 rounded-xl border bg-gradient-to-br p-4">
              <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
                Compra #{result.purchaseId}
              </p>
              <p className="font-mono text-base leading-relaxed font-semibold">
                {result.ticketNumbers.join(" · ")}
              </p>
            </div>
            <p className="text-muted-foreground text-center text-xs">
              {result.ticketNumbers.length} boleto
              {result.ticketNumbers.length === 1 ? "" : "s"} asignado
              {result.ticketNumbers.length === 1 ? "" : "s"}
            </p>
          </div>
        ) : null}
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="min-h-11 w-full" onClick={() => void copyTickets()}>
            <Copy className="mr-2 size-4" />
            Copiar números de boletos
          </Button>
          <Button variant="outline" className="min-h-11 w-full" asChild>
            <Link to="/verificar">Verificar mis boletos</Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
