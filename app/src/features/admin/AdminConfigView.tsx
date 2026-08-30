import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { AdminMaintenanceSection } from "@/features/admin/AdminMaintenanceSection"
import {
  type AdminSiteConfigDraft,
  apiToDraft,
  defaultAdminSiteConfigDraft,
  draftsEqual,
  validateDraft,
} from "@/features/admin/config/admin-site-config"
import { ColorField } from "@/features/admin/config/ColorField"
import { EmailConfigTab } from "@/features/admin/config/EmailConfigTab"
import { OfficialLogosEditor } from "@/features/admin/config/OfficialLogosEditor"
import { PostPurchasePromoConfigTab } from "@/features/admin/config/PostPurchasePromoConfigTab"
import { PurchaseRejectReasonsEditor } from "@/features/admin/config/PurchaseRejectReasonsEditor"
import { PurchasesAccessKeyCard } from "@/features/admin/config/PurchasesAccessKeyCard"
import { SitePreviewCard } from "@/features/admin/config/SitePreviewCard"
import { adminNavTitle } from "@/features/admin/nav"
import { ConfirmAction } from "@/features/admin/purchases/ConfirmAction"
import { AdminImageUploadField } from "@/features/admin/shared/AdminImageUploadField"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { publicQueryKeys } from "@/features/layout/public-queries"
import { DEFAULT_HOW_TO_PLAY_LABEL } from "@/features/raffle/how-to-play"
import { adminFetch } from "@/lib/admin-fetch"
import { useSiteConfig } from "@/stores/site-config"

function patchDraft<K extends keyof AdminSiteConfigDraft>(
  draft: AdminSiteConfigDraft,
  key: K,
  value: AdminSiteConfigDraft[K],
): AdminSiteConfigDraft {
  return { ...draft, [key]: value }
}

export function AdminConfigView() {
  const queryClient = useQueryClient()
  const setFromApi = useSiteConfig((state) => state.setFromApi)
  const [draft, setDraft] = useState<AdminSiteConfigDraft>(defaultAdminSiteConfigDraft)
  const [saved, setSaved] = useState<AdminSiteConfigDraft>(defaultAdminSiteConfigDraft)
  const [confirmSave, setConfirmSave] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const configQuery = useQuery({
    queryKey: ["admin", "config"],
    queryFn: () => adminFetch<Record<string, unknown>>("/api/admin/config"),
  })

  useEffect(() => {
    if (!configQuery.data) return
    const loaded = apiToDraft(configQuery.data)
    setDraft(loaded)
    setSaved(loaded)
    setFieldErrors({})
  }, [configQuery.data])

  const isDirty = useMemo(() => !draftsEqual(draft, saved), [draft, saved])
  const whatsappEnabled = Boolean(
    (configQuery.data?.features as { whatsapp_enabled?: boolean } | undefined)?.whatsapp_enabled,
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const result = validateDraft(draft)
      if (!result.ok) {
        setFieldErrors(result.fieldErrors)
        throw new Error("Revisa los campos marcados")
      }
      setFieldErrors({})
      await adminFetch("/api/admin/config", {
        method: "PATCH",
        body: JSON.stringify({ patch: result.patch }),
      })
      return result.patch
    },
    onSuccess: (patch) => {
      toast.success("Configuración guardada")
      setConfirmSave(false)
      setSaved(draft)
      setFromApi(patch)
      void queryClient.invalidateQueries({ queryKey: ["admin", "config"] })
      void queryClient.invalidateQueries({ queryKey: publicQueryKeys.siteConfig })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function update<K extends keyof AdminSiteConfigDraft>(key: K, value: AdminSiteConfigDraft[K]) {
    setDraft((current) => patchDraft(current, key, value))
  }

  function resetDraft() {
    setDraft(saved)
    setFieldErrors({})
  }

  function fieldError(...paths: string[]) {
    for (const path of paths) {
      if (fieldErrors[path]) return fieldErrors[path]
    }
    return undefined
  }

  if (configQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (configQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <AdminPageHeader
          title={adminNavTitle("/admin/config")}
          description="Personaliza tu sitio público."
        />
        <Card>
          <CardContent className="flex flex-col gap-3 py-8">
            <p className="text-destructive text-sm">No se pudo cargar la configuración.</p>
            <Button className="min-h-11 w-fit" onClick={() => void configQuery.refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-28 lg:pb-6">
      <AdminPageHeader
        title={adminNavTitle("/admin/config")}
        description="Marca, inicio, SEO, colores, contacto y correos. La vista previa se actualiza al instante."
      />

      <SitePreviewCard draft={draft} />

      <Tabs defaultValue="identity" className="gap-4">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 p-1">
          <TabsTrigger value="identity" className="min-h-9 flex-1 text-xs sm:text-sm">
            Identidad
          </TabsTrigger>
          <TabsTrigger value="home" className="min-h-9 flex-1 text-xs sm:text-sm">
            Inicio
          </TabsTrigger>
          <TabsTrigger value="seo" className="min-h-9 flex-1 text-xs sm:text-sm">
            SEO
          </TabsTrigger>
          <TabsTrigger value="colors" className="min-h-9 flex-1 text-xs sm:text-sm">
            Colores
          </TabsTrigger>
          <TabsTrigger value="contact" className="min-h-9 flex-1 text-xs sm:text-sm">
            Contacto
          </TabsTrigger>
          <TabsTrigger value="purchases" className="min-h-9 flex-1 text-xs sm:text-sm">
            Compras
          </TabsTrigger>
          <TabsTrigger value="email" className="min-h-9 flex-1 text-xs sm:text-sm">
            Correos
          </TabsTrigger>
          <TabsTrigger value="post-purchase" className="min-h-9 flex-1 text-xs sm:text-sm">
            Post-compra
          </TabsTrigger>
          <TabsTrigger value="footer" className="min-h-9 flex-1 text-xs sm:text-sm">
            Pie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle>Identidad</CardTitle>
              <CardDescription>Nombre, eslogan y logo del sitio.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!fieldError("site_info.site_name")}>
                  <FieldLabel htmlFor="site-name">Nombre del sitio</FieldLabel>
                  <Input
                    id="site-name"
                    className="min-h-11"
                    value={draft.site_name}
                    onChange={(e) => update("site_name", e.target.value)}
                    aria-invalid={!!fieldError("site_info.site_name")}
                  />
                  <FieldError>{fieldError("site_info.site_name")}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="tagline">Eslogan</FieldLabel>
                  <Input
                    id="tagline"
                    className="min-h-11"
                    value={draft.tagline}
                    onChange={(e) => update("tagline", e.target.value)}
                  />
                  <FieldDescription>Aparece en el pie y como respaldo del SEO.</FieldDescription>
                </Field>
                <AdminImageUploadField
                  id="logo"
                  label="Logo"
                  description="Cuadrado o horizontal, fondo transparente recomendado."
                  kind="site"
                  value={draft.logo || null}
                  onChange={(url) => update("logo", url ?? "")}
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="home">
          <Card>
            <CardHeader>
              <CardTitle>Inicio</CardTitle>
              <CardDescription>Textos del hero y banner de la página principal.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="hero-title">Título principal</FieldLabel>
                  <Input
                    id="hero-title"
                    className="min-h-11"
                    value={draft.hero_title}
                    onChange={(e) => update("hero_title", e.target.value)}
                    placeholder={draft.site_name || "Rifas Premium"}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="hero-subtitle">Subtítulo</FieldLabel>
                  <Input
                    id="hero-subtitle"
                    className="min-h-11"
                    value={draft.hero_subtitle}
                    onChange={(e) => update("hero_subtitle", e.target.value)}
                    placeholder={draft.tagline || "¡Tu oportunidad de ganar!"}
                  />
                </Field>
                <Field data-invalid={!!fieldError("hero_config.how_to_play_label")}>
                  <FieldLabel htmlFor="how-to-play-label">Texto de cómo se juega</FieldLabel>
                  <Input
                    id="how-to-play-label"
                    className="min-h-11"
                    value={draft.how_to_play_label}
                    onChange={(e) => update("how_to_play_label", e.target.value)}
                    placeholder={DEFAULT_HOW_TO_PLAY_LABEL}
                    maxLength={80}
                    aria-invalid={!!fieldError("hero_config.how_to_play_label")}
                  />
                  <FieldDescription>
                    Sale en la rifa activa. Vacío = {DEFAULT_HOW_TO_PLAY_LABEL}.
                  </FieldDescription>
                  <FieldError>{fieldError("hero_config.how_to_play_label")}</FieldError>
                </Field>
                <AdminImageUploadField
                  id="banner"
                  label="Banner de inicio"
                  description="Se muestra arriba del contenido cuando no hay imagen de rifa."
                  kind="site"
                  value={draft.banner || null}
                  onChange={(url) => update("banner", url ?? "")}
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
              <CardDescription>
                Cómo aparece tu sitio en buscadores y al compartir enlaces.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!fieldError("seo_config.meta_title")}>
                  <FieldLabel htmlFor="meta-title">Título meta</FieldLabel>
                  <Input
                    id="meta-title"
                    className="min-h-11"
                    value={draft.meta_title}
                    onChange={(e) => update("meta_title", e.target.value)}
                    placeholder={draft.site_name}
                    maxLength={70}
                    aria-invalid={!!fieldError("seo_config.meta_title")}
                  />
                  <FieldDescription>Máx. 70 caracteres. Vacío = nombre del sitio.</FieldDescription>
                  <FieldError>{fieldError("seo_config.meta_title")}</FieldError>
                </Field>
                <Field data-invalid={!!fieldError("seo_config.meta_description")}>
                  <FieldLabel htmlFor="meta-description">Descripción meta</FieldLabel>
                  <Textarea
                    id="meta-description"
                    value={draft.meta_description}
                    onChange={(e) => update("meta_description", e.target.value)}
                    placeholder={draft.tagline}
                    maxLength={160}
                    rows={3}
                    aria-invalid={!!fieldError("seo_config.meta_description")}
                  />
                  <FieldDescription>Máx. 160 caracteres. Vacío = eslogan.</FieldDescription>
                  <FieldError>{fieldError("seo_config.meta_description")}</FieldError>
                </Field>
                <AdminImageUploadField
                  id="og-image"
                  label="Imagen para compartir (Open Graph)"
                  description="Recomendado 1200×630. Vacío = banner o logo."
                  kind="site"
                  value={draft.og_image || null}
                  onChange={(url) => update("og_image", url ?? "")}
                />
                <Field data-invalid={!!fieldError("seo_config.canonical_url")}>
                  <FieldLabel htmlFor="canonical-url">URL canónica (opcional)</FieldLabel>
                  <Input
                    id="canonical-url"
                    type="url"
                    className="min-h-11"
                    value={draft.canonical_url}
                    onChange={(e) => update("canonical_url", e.target.value)}
                    placeholder="https://tusitio.com"
                    aria-invalid={!!fieldError("seo_config.canonical_url")}
                  />
                  <FieldError>{fieldError("seo_config.canonical_url")}</FieldError>
                </Field>
                <Field orientation="horizontal">
                  <FieldContentSwitch
                    id="indexable"
                    label="Permitir indexación"
                    description="Desactiva para ocultar el sitio en Google (noindex)."
                    checked={draft.indexable}
                    onCheckedChange={(checked) => update("indexable", checked)}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Colores de marca</CardTitle>
              <CardDescription>Botones, acentos y gradientes del sitio público.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <ColorField
                id="primary"
                label="Primario"
                value={draft.primary}
                onChange={(v) => update("primary", v)}
                error={fieldError("site_colors.primary")}
              />
              <ColorField
                id="secondary"
                label="Secundario"
                value={draft.secondary}
                onChange={(v) => update("secondary", v)}
                error={fieldError("site_colors.secondary")}
              />
              <ColorField
                id="accent"
                label="Acento"
                value={draft.accent}
                onChange={(v) => update("accent", v)}
                error={fieldError("site_colors.accent")}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="post-purchase">
          <PostPurchasePromoConfigTab
            promo={draft.purchase_success_promo}
            onChange={(purchase_success_promo) =>
              update("purchase_success_promo", purchase_success_promo)
            }
            fieldError={fieldError}
            whatsappEnabled={whatsappEnabled}
          />
        </TabsContent>

        <TabsContent value="footer">
          <Card>
            <CardHeader>
              <CardTitle>Pie de página</CardTitle>
              <CardDescription>
                Logo del footer, sellos oficiales y autorización RUNLOT. Los enlaces sociales se
                configuran en Contacto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!fieldError("site_info.runlot_id")}>
                  <FieldLabel htmlFor="runlot-id">ID RUNLOT (opcional)</FieldLabel>
                  <Input
                    id="runlot-id"
                    className="min-h-11"
                    value={draft.runlot_id}
                    placeholder="Ej. 12345"
                    onChange={(e) => update("runlot_id", e.target.value)}
                    aria-invalid={!!fieldError("site_info.runlot_id")}
                  />
                  <FieldDescription>
                    Número de autorización para venta de rifas. Se muestra en el pie del sitio
                    cuando está configurado.
                  </FieldDescription>
                  <FieldError>{fieldError("site_info.runlot_id")}</FieldError>
                </Field>
                <AdminImageUploadField
                  id="footer-logo"
                  label="Logo del footer"
                  description="Si está vacío, se usa el logo principal del sitio."
                  kind="site"
                  value={draft.footer_logo || null}
                  onChange={(url) => update("footer_logo", url ?? "")}
                />
                <OfficialLogosEditor
                  logos={draft.official_logos}
                  onChange={(official_logos) => update("official_logos", official_logos)}
                />
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contacto y redes</CardTitle>
              <CardDescription>Elige el canal de soporte. Por defecto es Telegram.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                  <Input
                    id="phone"
                    className="min-h-11"
                    value={draft.phone}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                </Field>
                <Field data-invalid={!!fieldError("contact_info.email")}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    className="min-h-11"
                    value={draft.email}
                    onChange={(e) => update("email", e.target.value)}
                    aria-invalid={!!fieldError("contact_info.email")}
                  />
                  <FieldError>{fieldError("contact_info.email")}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="address">Dirección</FieldLabel>
                  <Input
                    id="address"
                    className="min-h-11"
                    value={draft.address}
                    onChange={(e) => update("address", e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel id="support-channel-label">Canal de soporte</FieldLabel>
                  <div
                    role="group"
                    aria-labelledby="support-channel-label"
                    className="grid grid-cols-2 gap-2"
                  >
                    <Button
                      type="button"
                      variant={draft.support_channel === "telegram" ? "default" : "outline"}
                      className="min-h-11"
                      aria-pressed={draft.support_channel === "telegram"}
                      onClick={() => update("support_channel", "telegram")}
                    >
                      Telegram
                    </Button>
                    <Button
                      type="button"
                      variant={draft.support_channel === "whatsapp" ? "default" : "outline"}
                      className="min-h-11"
                      aria-pressed={draft.support_channel === "whatsapp"}
                      disabled={!whatsappEnabled}
                      onClick={() => update("support_channel", "whatsapp")}
                    >
                      WhatsApp
                    </Button>
                  </div>
                  <FieldDescription>
                    {whatsappEnabled
                      ? "FAB, verify, errores, post-compra y emails de rechazo usan este canal."
                      : "WhatsApp está desactivado (ENABLE_WHATSAPP=false). El soporte usa Telegram."}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="telegram">Telegram (soporte)</FieldLabel>
                  <Input
                    id="telegram"
                    className="min-h-11"
                    value={draft.telegram}
                    onChange={(e) => update("telegram", e.target.value)}
                    placeholder="yoiberifas o https://t.me/yoiberifas"
                  />
                  <FieldDescription>
                    Usuario o URL de soporte. Si lo dejas vacío se usa yoiberifas.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="whatsapp">
                    WhatsApp (solo números)
                    {!whatsappEnabled ? " — inactivo" : ""}
                  </FieldLabel>
                  <Input
                    id="whatsapp"
                    className="min-h-11"
                    value={draft.whatsapp}
                    onChange={(e) => update("whatsapp", e.target.value)}
                    placeholder="584121234567"
                    disabled={!whatsappEnabled}
                  />
                  {!whatsappEnabled ? (
                    <FieldDescription>
                      Desactivado por env. Activa ENABLE_WHATSAPP para poder elegirlo.
                    </FieldDescription>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="instagram">Instagram</FieldLabel>
                  <Input
                    id="instagram"
                    className="min-h-11"
                    value={draft.instagram}
                    onChange={(e) => update("instagram", e.target.value)}
                    placeholder="@usuario o URL"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="facebook">Facebook</FieldLabel>
                  <Input
                    id="facebook"
                    className="min-h-11"
                    value={draft.facebook}
                    onChange={(e) => update("facebook", e.target.value)}
                    placeholder="URL o página"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="tiktok">TikTok</FieldLabel>
                  <Input
                    id="tiktok"
                    className="min-h-11"
                    value={draft.tiktok}
                    onChange={(e) => update("tiktok", e.target.value)}
                    placeholder="@usuario o URL"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <PurchasesAccessKeyCard />
          <Card>
            <CardHeader>
              <CardTitle>Compras</CardTitle>
              <CardDescription>
                Motivos predefinidos al rechazar una compra en el panel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PurchaseRejectReasonsEditor
                reasons={draft.purchase_reject_reasons}
                onChange={(purchase_reject_reasons) =>
                  update("purchase_reject_reasons", purchase_reject_reasons)
                }
                fieldError={fieldError}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <EmailConfigTab
            settings={draft.email_settings}
            siteName={draft.site_name}
            onChange={(email_settings) => update("email_settings", email_settings)}
            fieldError={fieldError}
          />
        </TabsContent>
      </Tabs>

      <div className="border-border/60 space-y-4 border-t pt-6">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Operaciones
        </p>
        <AdminMaintenanceSection />
      </div>

      <div className="bg-background/95 border-border/80 fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t p-4 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 flex-1 lg:flex-none"
          disabled={!isDirty || saveMutation.isPending}
          onClick={resetDraft}
        >
          Descartar
        </Button>
        <Button
          className="min-h-11 flex-[2] lg:flex-none"
          disabled={!isDirty || saveMutation.isPending}
          onClick={() => setConfirmSave(true)}
        >
          {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>

      <ConfirmAction
        open={confirmSave}
        onOpenChange={setConfirmSave}
        title="Guardar configuración"
        description="Se publicarán los cambios en el sitio para todos los visitantes."
        confirmLabel="Guardar"
        pending={saveMutation.isPending}
        onConfirm={() => saveMutation.mutate()}
      />
    </div>
  )
}

function FieldContentSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex w-full items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
