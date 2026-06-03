import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  TEST_EMAIL_VARIANTS,
  testEmailPreviewSubject,
} from "@/features/admin/emails/email-labels"
import { adminFetch } from "@/lib/admin-fetch"

type EmailTestDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmailTestDialog({ open, onOpenChange }: EmailTestDialogProps) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState("")
  const [variantId, setVariantId] = useState(TEST_EMAIL_VARIANTS[0].id)

  const variant =
    TEST_EMAIL_VARIANTS.find((o) => o.id === variantId)?.variant ?? TEST_EMAIL_VARIANTS[0].variant

  const previewSubject = useMemo(() => {
    if (!email.trim()) return null
    return testEmailPreviewSubject(variant)
  }, [email, variant])

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { to: email.trim(), type: variant.type }
      if (variant.type === "status_update") body.status = variant.status
      if (variant.type === "ticket_modification") body.modification = variant.modification
      return adminFetch("/api/admin/emails", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      toast.success("Correo de prueba enviado")
      void queryClient.invalidateQueries({ queryKey: ["admin", "emails"] })
      onOpenChange(false)
      setEmail("")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar correo de prueba</DialogTitle>
          <DialogDescription>
            Usa las mismas plantillas que en producción. El envío quedará en el historial.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="test-email-to">Destinatario</Label>
            <Input
              id="test-email-to"
              type="email"
              className="mt-1.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <Label>Plantilla</Label>
            <Select value={variantId} onValueChange={setVariantId}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_EMAIL_VARIANTS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {previewSubject ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground text-xs font-medium uppercase">Vista previa</p>
              <p className="mt-1 font-medium">{previewSubject}</p>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!email.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
