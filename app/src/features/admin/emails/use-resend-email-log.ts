import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useState } from "react"
import { toast } from "sonner"
import type { EmailLogRow } from "@/features/admin/emails/types"
import { adminFetch } from "@/lib/admin-fetch"

export function useResendEmailLog() {
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<EmailLogRow | null>(null)

  const mutation = useMutation({
    mutationFn: (logId: number) =>
      adminFetch(`/api/admin/emails/${logId}/resend`, { method: "POST" }),
    onSuccess: (_data, logId) => {
      toast.success("Correo reenviado")
      setTarget(null)
      void queryClient.invalidateQueries({ queryKey: ["admin", "emails"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "emails", "detail", logId] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const requestResend = useCallback((log: EmailLogRow) => setTarget(log), [])
  const cancelResend = useCallback(() => setTarget(null), [])

  return {
    target,
    requestResend,
    cancelResend,
    confirmResend: () => target && mutation.mutate(target.id),
    isPending: mutation.isPending,
    description: target
      ? `¿Reenviar "${target.subject}" a ${target.recipient_email}?`
      : "",
  }
}
