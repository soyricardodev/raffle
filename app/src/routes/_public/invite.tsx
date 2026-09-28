import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { CheckCircle2, KeyRound } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildPublicPageHead } from "@/features/layout/document-head"
import { usePublicSiteConfigFromLayout } from "@/features/layout/public-site-config-context"
export const Route = createFileRoute("/_public/invite")({
  head: ({ matches }) =>
    buildPublicPageHead({ pageTitle: "Activar acceso", robots: "noindex, nofollow", matches }),
  component: InvitePage,
})
function InvitePage() {
  const navigate = useNavigate()
  const siteName = usePublicSiteConfigFromLayout()?.site_info?.site_name ?? "Rifas"
  const [token, setToken] = useState("")
  const [person, setPerson] = useState<{ name: string; email: string } | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""
    setToken(value)
    if (!value) {
      setError("Falta el enlace de invitación. Solicita uno nuevo al administrador.")
      return
    }
    void fetch("/api/invitations/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: value }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Este enlace caducó o ya fue usado")
        return response.json()
      })
      .then(setPerson)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Invitación inválida"))
  }, [])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden")
      return
    }
    setBusy(true)
    try {
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message ?? "No se pudo activar la cuenta")
      }
      window.history.replaceState(null, "", "/invite")
      setDone(true)
      toast.success("Cuenta activada")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error")
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="bg-background min-h-svh">
      <header className="flex h-16 items-center justify-between border-b px-4 sm:px-8">
        <Link className="font-heading text-lg font-semibold" to="/">
          {siteName}
        </Link>
        <span className="text-muted-foreground text-xs font-medium">Acceso del equipo</span>
      </header>
      <main className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-md items-center px-4 py-10">
        <div className="w-full space-y-5 rounded-3xl border bg-card p-6 shadow-sm">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
            {done ? <CheckCircle2 /> : <KeyRound />}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">
              {done ? "Tu acceso está listo" : "Activa tu cuenta"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {done
                ? "Ya puedes iniciar sesión con tu correo y clave."
                : error
                  ? error
                  : person
                  ? `Hola ${person.name}. Tu acceso está preparado para ${person.email}. Elige una contraseña para empezar.`
                  : "Comprobando invitación…"}
            </p>
          </div>
          {done ? (
            <Button className="w-full" onClick={() => void navigate({ to: "/login" })}>
              Ir a iniciar sesión
            </Button>
          ) : person ? (
            <form className="space-y-4" onSubmit={(event) => void submit(event)}>
              <div className="space-y-2">
                <Label htmlFor="invite-password">Contraseña</Label>
                <Input
                  id="invite-password"
                  autoComplete="new-password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p className="text-muted-foreground text-xs">Mínimo 12 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-confirm">Confirmar contraseña</Label>
                <Input
                  id="invite-confirm"
                  autoComplete="new-password"
                  type="password"
                  minLength={12}
                  required
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Activando…" : "Activar acceso"}
              </Button>
            </form>
          ) : (
            <Link className="text-primary text-sm underline" to="/login">
              Volver al inicio de sesión
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
