import { z } from "zod"

/** Aligns with Better Auth default password limits (email + password plugin). */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(100, "La contraseña no puede superar 100 caracteres")
