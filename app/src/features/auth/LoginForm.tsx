import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authClient } from "./auth-client"
import { DevFastLogin } from "./DevFastLogin"

type LoginFormProps = {
  redirectTo?: string
}

export function LoginForm({ redirectTo = "/admin" }: LoginFormProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })
      if (result.error) {
        toast.error(result.error.message ?? "Credenciales inválidas")
        return
      }
      toast.success("Sesión iniciada")
      await navigate({ to: redirectTo })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al iniciar sesión"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDevLogin(e: string, p: string) {
    const result = await authClient.signIn.email({ email: e, password: p })
    if (result.error) {
      toast.error(result.error.message ?? "Credenciales inválidas")
      return
    }
    toast.success("Fast login — sesión iniciada")
    await navigate({ to: redirectTo })
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="font-heading text-2xl">Panel administrador</CardTitle>
        <CardDescription>Inicia sesión para gestionar rifas y ventas</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@rifas.com"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        {import.meta.env.DEV ? (
          <div className="mt-3">
            <p className="text-muted-foreground mb-2 text-center text-xs">
              Dev: credenciales precargadas en seed. O usa fast login:
            </p>
            <DevFastLogin onSignIn={handleDevLogin} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
