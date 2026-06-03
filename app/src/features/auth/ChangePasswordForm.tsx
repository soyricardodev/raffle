import { EyeIcon, EyeSlashIcon, KeyIcon } from "@phosphor-icons/react"
import type { ChangePasswordPayload } from "@raffle/shared/validators"
import { validateChangePasswordForm } from "@raffle/shared/validators"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useId, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AdminPageHeader } from "@/features/admin/shared/AdminPageHeader"
import { changePassword, signOut } from "@/features/auth/auth-client"
import { cn } from "@/lib/utils"

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
  disabled?: boolean
  error?: string
  description?: string
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  disabled,
  error,
  description,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={cn("pr-10", error && "border-destructive")}
          aria-invalid={error ? true : undefined}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </Button>
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}

function ChangePasswordCard({
  formId,
  currentPassword,
  newPassword,
  confirmPassword,
  fieldErrors,
  isPending,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: {
  formId: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
  fieldErrors: Record<string, string>
  isPending: boolean
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
}) {
  return (
    <Card className="border-border/80">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
            <KeyIcon className="size-5" weight="duotone" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">Cambiar contraseña</CardTitle>
            <CardDescription>
              Usa una contraseña segura. Al guardar cerraremos tu sesión; inicia sesión de nuevo con
              la nueva contraseña.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form id={formId} className="space-y-6" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <PasswordField
              id={`${formId}-current`}
              label="Contraseña actual"
              value={currentPassword}
              onChange={onCurrentPasswordChange}
              autoComplete="current-password"
              disabled={isPending}
              error={fieldErrors.currentPassword}
            />
            <PasswordField
              id={`${formId}-new`}
              label="Nueva contraseña"
              value={newPassword}
              onChange={onNewPasswordChange}
              autoComplete="new-password"
              disabled={isPending}
              error={fieldErrors.newPassword}
              description="Mínimo 8 caracteres."
            />
            <PasswordField
              id={`${formId}-confirm`}
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={onConfirmPasswordChange}
              autoComplete="new-password"
              disabled={isPending}
              error={fieldErrors.confirmPassword}
            />
          </FieldGroup>

          <Button type="submit" className="w-full sm:w-auto" disabled={isPending}>
            {isPending ? "Guardando…" : "Actualizar contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function AdminAccountPage() {
  const formId = useId()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePassword(payload),
    onSuccess: async () => {
      toast.success("Contraseña actualizada. Inicia sesión con la nueva contraseña.")
      await signOut()
      await navigate({ to: "/login" })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const result = validateChangePasswordForm({
      currentPassword,
      newPassword,
      confirmPassword,
    })
    if (!result.ok) {
      setFieldErrors(result.fieldErrors)
      return
    }
    setFieldErrors({})
    mutation.mutate(result.data)
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Mi cuenta"
        description="Gestiona la seguridad de tu acceso al panel administrador."
      />
      <div className="max-w-lg">
        <ChangePasswordCard
          formId={formId}
          currentPassword={currentPassword}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          fieldErrors={fieldErrors}
          isPending={mutation.isPending}
          onCurrentPasswordChange={setCurrentPassword}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
