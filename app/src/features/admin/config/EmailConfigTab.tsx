import type { EmailSettings } from "@raffle/shared/site-config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

type EmailConfigTabProps = {
  settings: EmailSettings
  siteName: string
  onChange: (settings: EmailSettings) => void
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

export function EmailConfigTab({ settings, siteName, onChange, fieldError }: EmailConfigTabProps) {
  function patch<K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) {
    onChange({ ...settings, [key]: value })
  }

  const previewFromName = settings.from_name.trim() || siteName.trim() || "Rifas"
  const previewFromEmail = settings.from_email.trim() || "remitente@tudominio.com"

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Correos automáticos</CardTitle>
          <CardDescription>
            Remitente y notificaciones transaccionales. El dominio del remitente debe estar
            verificado en Resend.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldContentSwitch
              id="email-enabled"
              label="Habilitar envío automático"
              description="Si lo apagas, no salen correos automáticos (útil en mantenimiento)."
              checked={settings.enabled}
              onCheckedChange={(checked) => patch("enabled", checked)}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Remitente</CardTitle>
          <CardDescription>Lo que verá el cliente en la bandeja de entrada.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!fieldError("email_settings.from_name")}>
              <FieldLabel htmlFor="email-from-name">Nombre del remitente</FieldLabel>
              <Input
                id="email-from-name"
                className="min-h-11"
                value={settings.from_name}
                onChange={(e) => patch("from_name", e.target.value)}
                placeholder={siteName || "Rifas Premium"}
              />
              <FieldError>{fieldError("email_settings.from_name")}</FieldError>
            </Field>
            <Field data-invalid={!!fieldError("email_settings.from_email")}>
              <FieldLabel htmlFor="email-from-email">Email del remitente</FieldLabel>
              <Input
                id="email-from-email"
                type="email"
                className="min-h-11"
                value={settings.from_email}
                onChange={(e) => patch("from_email", e.target.value)}
                placeholder="hola@tudominio.com"
                aria-invalid={!!fieldError("email_settings.from_email")}
              />
              <FieldDescription>Dominio verificado en tu proveedor (Resend/Brevo).</FieldDescription>
              <FieldError>{fieldError("email_settings.from_email")}</FieldError>
            </Field>
            <Field data-invalid={!!fieldError("email_settings.reply_to")}>
              <FieldLabel htmlFor="email-reply-to">Responder a (opcional)</FieldLabel>
              <Input
                id="email-reply-to"
                type="email"
                className="min-h-11"
                value={settings.reply_to}
                onChange={(e) => patch("reply_to", e.target.value)}
                placeholder="soporte@tudominio.com"
                aria-invalid={!!fieldError("email_settings.reply_to")}
              />
              <FieldError>{fieldError("email_settings.reply_to")}</FieldError>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de correo</CardTitle>
          <CardDescription>Qué eventos disparan un email al cliente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldContentSwitch
            id="email-send-confirmation"
            label="Confirmación de compra"
            description="Al registrar una compra pendiente."
            checked={settings.send_confirmation}
            onCheckedChange={(checked) => patch("send_confirmation", checked)}
          />
          <FieldContentSwitch
            id="email-send-status"
            label="Actualización de estado"
            description="Al aprobar o rechazar una compra."
            checked={settings.send_status_updates}
            onCheckedChange={(checked) => patch("send_status_updates", checked)}
          />
          <FieldContentSwitch
            id="email-send-modifications"
            label="Modificación de boletos"
            description="Al agregar o quitar boletos de una compra."
            checked={settings.send_modifications}
            onCheckedChange={(checked) => patch("send_modifications", checked)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/40 rounded-xl border p-4 text-sm">
            <p>
              <span className="text-muted-foreground">De:</span> {previewFromName} &lt;
              {previewFromEmail}&gt;
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Para:</span> cliente@ejemplo.com
            </p>
            {settings.reply_to.trim() ? (
              <p className="mt-1">
                <span className="text-muted-foreground">Responder a:</span> {settings.reply_to}
              </p>
            ) : null}
            <p className="mt-1">
              <span className="text-muted-foreground">Asunto:</span> Confirmación de compra —{" "}
              {siteName || "Rifas"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
