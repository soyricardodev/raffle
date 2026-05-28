import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { AdminMaintenanceSection } from "@/features/admin/AdminMaintenanceSection"
import { ColorField } from "@/features/admin/config/ColorField"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { adminFetch } from "@/lib/admin-fetch"
import { normalizeHeroConfig, useSiteConfig } from "@/stores/site-config"

type SiteConfigApi = {
  site_info?: { site_name?: string; tagline?: string }
  site_colors?: { primary?: string; secondary?: string; accent?: string }
  contact_info?: { phone?: string; email?: string; address?: string }
  social_media?: { whatsapp?: string; instagram?: string; facebook?: string }
  hero_config?: {
    title?: string
    subtitle?: string
    main_text?: string
    accent_text?: string
    show_particles?: boolean
  }
  site_images?: { banner?: string; logo?: string }
}

export function AdminConfigView() {
  const queryClient = useQueryClient()
  const setFromApi = useSiteConfig((state) => state.setFromApi)
  const [confirmSave, setConfirmSave] = useState(false)
  const [bannerPreviewError, setBannerPreviewError] = useState(false)

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
  const [whatsapp, setWhatsapp] = useState("")
  const [instagram, setInstagram] = useState("")
  const [facebook, setFacebook] = useState("")
  const [heroTitle, setHeroTitle] = useState("")
  const [heroSubtitle, setHeroSubtitle] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")

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
    setWhatsapp(config.social_media?.whatsapp ?? "")
    setInstagram(config.social_media?.instagram ?? "")
    setFacebook(config.social_media?.facebook ?? "")
    const hero = normalizeHeroConfig(config.hero_config)
    setHeroTitle(hero.title)
    setHeroSubtitle(hero.subtitle)
    setBannerUrl(config.site_images?.banner ?? "")
    setBannerPreviewError(false)
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
      await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          key: "social_media",
          value: {
            whatsapp: whatsapp.trim(),
            instagram: instagram.trim(),
            facebook: facebook.trim(),
          },
        }),
      })
      await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          key: "hero_config",
          value: { title: heroTitle.trim(), subtitle: heroSubtitle.trim(), show_particles: false },
        }),
      })
      await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          key: "site_images",
          value: { banner: bannerUrl.trim(), logo: configQuery.data?.site_images?.logo ?? "" },
        }),
      })
    },
    onSuccess: () => {
      toast.success("Configuración guardada")
      setConfirmSave(false)
      setFromApi({
        site_info: { site_name: siteName, tagline },
        site_colors: { primary, secondary, accent },
        contact_info: { phone, email, address },
        social_media: { whatsapp, instagram, facebook },
        hero_config: { title: heroTitle, subtitle: heroSubtitle, show_particles: false },
        site_images: { banner: bannerUrl, logo: configQuery.data?.site_images?.logo ?? "" },
      })
      void queryClient.invalidateQueries({ queryKey: ["admin", "config"] })
      void queryClient.invalidateQueries({ queryKey: ["site-config"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (configQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    )
  }

  const showBannerPreview = bannerUrl.trim().length > 0 && !bannerPreviewError

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24 lg:pb-6">
      <AdminPageHeader
        title="Configuración"
        description="Personaliza la identidad del sitio y datos de contacto."
      />

      <Card>
        <CardHeader>
          <CardTitle>Información del sitio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="site-name">Nombre</Label>
            <Input
              id="site-name"
              className="min-h-11"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="tagline">Eslogan</Label>
            <Input
              id="tagline"
              className="min-h-11"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inicio (hero)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="hero-title">Título principal</Label>
            <Input
              id="hero-title"
              className="min-h-11"
              value={heroTitle}
              onChange={(e) => setHeroTitle(e.target.value)}
              placeholder={siteName || "Rifas Premium"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subtítulo</Label>
            <Input
              id="hero-subtitle"
              className="min-h-11"
              value={heroSubtitle}
              onChange={(e) => setHeroSubtitle(e.target.value)}
              placeholder={tagline || "¡Tu oportunidad de ganar!"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-url">URL del banner</Label>
            <Input
              id="banner-url"
              type="url"
              className="min-h-11"
              value={bannerUrl}
              onChange={(e) => {
                setBannerUrl(e.target.value)
                setBannerPreviewError(false)
              }}
              placeholder="https://…"
            />
          </div>
          {showBannerPreview ? (
            <div className="overflow-hidden rounded-xl border bg-muted/30">
              <img
                src={bannerUrl.trim()}
                alt="Vista previa del banner"
                className="h-36 w-full object-cover md:h-44"
                onError={() => setBannerPreviewError(true)}
              />
            </div>
          ) : bannerUrl.trim() && bannerPreviewError ? (
            <p className="text-muted-foreground text-xs">
              No se pudo cargar la imagen. Revisa la URL.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colores de marca</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ColorField id="primary" label="Primario" value={primary} onChange={setPrimary} />
          <ColorField id="secondary" label="Secundario" value={secondary} onChange={setSecondary} />
          <ColorField id="accent" label="Acento" value={accent} onChange={setAccent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacto y redes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              className="min-h-11"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="min-h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              className="min-h-11"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="whatsapp">WhatsApp (solo números)</Label>
            <Input
              id="whatsapp"
              className="min-h-11"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="584121234567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              className="min-h-11"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@usuario o URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              className="min-h-11"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="URL o página"
            />
          </div>
        </CardContent>
      </Card>

      <AdminMaintenanceSection />

      <div className="bg-background/95 border-border/80 fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-t p-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Button
          className="min-h-11 w-full lg:w-auto"
          disabled={saveMutation.isPending}
          onClick={() => setConfirmSave(true)}
        >
          {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      <ConfirmAction
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Guardar configuración"
        description="Se actualizarán los datos del sitio, colores, contacto e imágenes públicas."
        confirmLabel="Guardar"
        pending={saveMutation.isPending}
        onConfirm={() => saveMutation.mutate()}
      />
    </div>
  )
}
