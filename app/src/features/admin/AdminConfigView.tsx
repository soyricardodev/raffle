import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adminFetch } from "@/lib/admin-fetch"
import { useSiteConfig } from "@/stores/site-config"

type SiteConfigApi = {
  site_info?: { site_name?: string; tagline?: string }
  site_colors?: { primary?: string; secondary?: string; accent?: string }
  contact_info?: { phone?: string; email?: string; address?: string }
}

export function AdminConfigView() {
  const queryClient = useQueryClient()
  const setFromApi = useSiteConfig((state) => state.setFromApi)

  const configQuery = useQuery({
    queryKey: ["admin", "config"],
    queryFn: () => adminFetch<SiteConfigApi>("/api/admin/config"),
  })

  const [siteName, setSiteName] = useState("")
  const [tagline, setTagline] = useState("")
  const [primary, setPrimary] = useState("#8B7355")
  const [secondary, setSecondary] = useState("#F5F5DC")
  const [accent, setAccent] = useState("#FFD700")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")

  useEffect(() => {
    const config = configQuery.data
    if (!config) return
    setSiteName(config.site_info?.site_name ?? "")
    setTagline(config.site_info?.tagline ?? "")
    setPrimary(config.site_colors?.primary ?? "#8B7355")
    setSecondary(config.site_colors?.secondary ?? "#F5F5DC")
    setAccent(config.site_colors?.accent ?? "#FFD700")
    setPhone(config.contact_info?.phone ?? "")
    setEmail(config.contact_info?.email ?? "")
    setAddress(config.contact_info?.address ?? "")
  }, [configQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          key: "site_info",
          value: { site_name: siteName.trim(), tagline: tagline.trim() },
        }),
      })
      await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          key: "site_colors",
          value: { primary, secondary, accent },
        }),
      })
      await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          key: "contact_info",
          value: { phone: phone.trim(), email: email.trim(), address: address.trim() },
        }),
      })
    },
    onSuccess: () => {
      toast.success("Configuración guardada")
      setFromApi({
        site_info: { site_name: siteName, tagline },
        site_colors: { primary, secondary, accent },
        contact_info: { phone, email, address },
      })
      void queryClient.invalidateQueries({ queryKey: ["admin", "config"] })
      void queryClient.invalidateQueries({ queryKey: ["site-config"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground text-sm">
          Personaliza la identidad del sitio y datos de contacto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del sitio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="site-name">Nombre</Label>
            <Input id="site-name" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tagline">Eslogan</Label>
            <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colores de marca</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {[
            { id: "primary", label: "Primario", value: primary, set: setPrimary },
            { id: "secondary", label: "Secundario", value: secondary, set: setSecondary },
            { id: "accent", label: "Acento", value: accent, set: setAccent },
          ].map((color) => (
            <div key={color.id} className="space-y-2">
              <Label htmlFor={color.id}>{color.label}</Label>
              <div className="flex gap-2">
                <input
                  id={color.id}
                  type="color"
                  value={color.value}
                  onChange={(e) => color.set(e.target.value)}
                  className="size-10 cursor-pointer rounded-lg border"
                />
                <Input value={color.value} onChange={(e) => color.set(e.target.value)} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  )
}
