import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminFetch } from "@/lib/admin-fetch"
import { formatDateTime } from "@/lib/format"
import { Mail, RefreshCw } from "lucide-react"

type EmailLogRow = {
  id: number
  purchase_id: number | null
  recipient_email: string
  email_type: string
  subject: string
  status: string
  sent_at: string | null
  created_at: string
  customer_name: string | null
}

export function AdminEmailsPanel() {
  const [testEmail, setTestEmail] = useState("")

  const logsQuery = useQuery({
    queryKey: ["admin", "emails"],
    queryFn: () => adminFetch<{ data: EmailLogRow[] }>("/api/admin/emails?limit=50"),
  })

  const testMutation = useMutation({
    mutationFn: () =>
      adminFetch("/api/admin/emails", {
        method: "POST",
        body: JSON.stringify({ to: testEmail.trim() }),
      }),
    onSuccess: () => toast.success("Email de prueba enviado"),
    onError: (error: Error) => toast.error(error.message),
  })

  const logs = logsQuery.data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Emails</h1>
        <p className="text-muted-foreground text-sm">Historial y pruebas de envío</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" />
            Email de prueba
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <div className="min-w-[240px] flex-1 space-y-2">
            <Label htmlFor="test-email">Destinatario</Label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
            />
          </div>
          <Button
            className="self-end"
            disabled={!testEmail.trim() || testMutation.isPending}
            onClick={() => testMutation.mutate()}
          >
            Enviar prueba
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Historial</CardTitle>
          <Button variant="outline" size="sm" onClick={() => void logsQuery.refetch()}>
            <RefreshCw className="mr-2 size-4" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{log.subject}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    log.status === "sent"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {log.status}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {log.recipient_email} · {log.email_type.replace(/_/g, " ")}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatDateTime(log.sent_at ?? log.created_at)}
                {log.customer_name ? ` · ${log.customer_name}` : ""}
              </p>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">Sin registros aún.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
