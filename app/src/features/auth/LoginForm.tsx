import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn } from "./auth-client"

type LoginFormProps = {
  redirectTo?: string
}

export function LoginForm({ redirectTo = "/admin" }: LoginFormProps) {
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    try {
      await signIn({ username, password })
      toast.success("Sesión iniciada")
      await navigate({ to: redirectTo })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al iniciar sesión"
      toast.error(message)
    } finally {
      setLoading(false)
    }
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
            <Label htmlFor="username">Usuario</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
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
          <p className="text-muted-foreground mt-4 text-center text-xs">
            Modo dev: cualquier usuario/contraseña abre el panel. Better Auth reemplazará esto.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
