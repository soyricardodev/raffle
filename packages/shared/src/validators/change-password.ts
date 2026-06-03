import { z } from "zod"
import { passwordSchema } from "./password.js"
import { zodIssuesToFieldErrors } from "./zod-utils.js"

export const ChangePasswordFormInput = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "La nueva contraseña debe ser distinta a la actual",
    path: ["newPassword"],
  })

export type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
}

export function validateChangePasswordForm(
  values: unknown,
):
  | { ok: true; data: ChangePasswordPayload }
  | { ok: false; fieldErrors: Record<string, string> } {
  const parsed = ChangePasswordFormInput.safeParse(values)
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodIssuesToFieldErrors(parsed.error.issues) }
  }
  return {
    ok: true,
    data: {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    },
  }
}
