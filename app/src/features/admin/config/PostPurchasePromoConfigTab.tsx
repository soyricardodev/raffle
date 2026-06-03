import type { PurchaseSuccessPromo } from "@raffle/shared/site-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

type PostPurchasePromoConfigTabProps = {
  promo: PurchaseSuccessPromo
  onChange: (promo: PurchaseSuccessPromo) => void
  fieldError: (path: string) => string | undefined
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

export function PostPurchasePromoConfigTab({
  promo,
  onChange,
  fieldError,
}: PostPurchasePromoConfigTabProps) {
  function patch<K extends keyof PurchaseSuccessPromo>(key: K, value: PurchaseSuccessPromo[K]) {
    onChange({ ...promo, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawer post-compra</CardTitle>
        <CardDescription>
          Se muestra solo en la primera compra del comprador. El botón de finalización usa el WhatsApp
          de la pestaña Contacto con un mensaje prellenado. Las redes de Contacto también aparecen
          en el drawer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContentSwitch
              id="purchase-success-promo-enabled"
              label="Mostrar bloque promocional"
              description="Visible en la primera compra cuando hay título, mensaje o enlaces configurados."
              checked={promo.enabled}
              onCheckedChange={(checked) => patch("enabled", checked)}
            />
          </Field>
          <Field data-invalid={!!fieldError("purchase_success_promo.title")}>
            <FieldLabel htmlFor="purchase-success-promo-title">Título</FieldLabel>
            <Input
              id="purchase-success-promo-title"
              className="min-h-11"
              value={promo.title}
              onChange={(e) => patch("title", e.target.value)}
              placeholder="Únete a mi comunidad"
              aria-invalid={!!fieldError("purchase_success_promo.title")}
            />
            <FieldError>{fieldError("purchase_success_promo.title")}</FieldError>
          </Field>
          <Field data-invalid={!!fieldError("purchase_success_promo.description")}>
            <FieldLabel htmlFor="purchase-success-promo-description">Mensaje</FieldLabel>
            <Textarea
              id="purchase-success-promo-description"
              value={promo.description}
              onChange={(e) => patch("description", e.target.value)}
              placeholder="Participa en dinámicas exclusivas y sorteos para compradores."
              rows={3}
              maxLength={300}
              aria-invalid={!!fieldError("purchase_success_promo.description")}
            />
            <FieldDescription>Máx. 300 caracteres.</FieldDescription>
            <FieldError>{fieldError("purchase_success_promo.description")}</FieldError>
          </Field>
          <Field data-invalid={!!fieldError("purchase_success_promo.whatsapp_channel_url")}>
            <FieldLabel htmlFor="purchase-success-promo-whatsapp">
              Canal o comunidad de WhatsApp
            </FieldLabel>
            <Input
              id="purchase-success-promo-whatsapp"
              type="url"
              className="min-h-11"
              value={promo.whatsapp_channel_url}
              onChange={(e) => patch("whatsapp_channel_url", e.target.value)}
              placeholder="https://whatsapp.com/channel/..."
              aria-invalid={!!fieldError("purchase_success_promo.whatsapp_channel_url")}
            />
            <FieldDescription>
              URL de invitación al canal (no uses el número de soporte).
            </FieldDescription>
            <FieldError>{fieldError("purchase_success_promo.whatsapp_channel_url")}</FieldError>
          </Field>
          <Field data-invalid={!!fieldError("purchase_success_promo.instagram_url")}>
            <FieldLabel htmlFor="purchase-success-promo-instagram">Instagram</FieldLabel>
            <Input
              id="purchase-success-promo-instagram"
              className="min-h-11"
              value={promo.instagram_url}
              onChange={(e) => patch("instagram_url", e.target.value)}
              placeholder="@usuario o URL"
              aria-invalid={!!fieldError("purchase_success_promo.instagram_url")}
            />
            <FieldError>{fieldError("purchase_success_promo.instagram_url")}</FieldError>
          </Field>
          <Field data-invalid={!!fieldError("purchase_success_promo.tiktok_url")}>
            <FieldLabel htmlFor="purchase-success-promo-tiktok">TikTok</FieldLabel>
            <Input
              id="purchase-success-promo-tiktok"
              className="min-h-11"
              value={promo.tiktok_url}
              onChange={(e) => patch("tiktok_url", e.target.value)}
              placeholder="@usuario o URL"
              aria-invalid={!!fieldError("purchase_success_promo.tiktok_url")}
            />
            <FieldDescription>
              Opcional si ya configuraste TikTok en Contacto; se usa como respaldo en el drawer.
            </FieldDescription>
            <FieldError>{fieldError("purchase_success_promo.tiktok_url")}</FieldError>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
