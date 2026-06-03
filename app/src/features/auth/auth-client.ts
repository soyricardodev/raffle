import { createAuthClient } from "better-auth/react"
import type { AuthSession } from "./types"

function resolveAuthBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  )
}

/** Better Auth client — singleton compartido. */
export const authClient = createAuthClient({
  baseURL: resolveAuthBaseUrl(),
})

/** Client-side session para compatibilidad con guards legacy. */
export function getClientSession(): AuthSession | null {
  if (typeof window === "undefined") return null
  // La sesión real viene de la cookie httpOnly, no de sessionStorage.
  // Esto es un helper temporal para los route guards.
  return null
}

type AuthClientError = {
  message?: string
  code?: string
}

function formatChangePasswordError(error: AuthClientError): string {
  const code = error.code?.toUpperCase()
  if (code === "INVALID_PASSWORD") {
    return "La contraseña actual no es correcta"
  }
  if (code === "PASSWORD_TOO_SHORT") {
    return "La nueva contraseña es demasiado corta"
  }
  if (code === "PASSWORD_TOO_LONG") {
    return "La nueva contraseña es demasiado larga"
  }

  const normalized = (error.message ?? "").toLowerCase()
  if (normalized.includes("invalid password") || normalized.includes("incorrect")) {
    return "La contraseña actual no es correcta"
  }
  if (normalized.includes("too short")) {
    return "La nueva contraseña es demasiado corta"
  }
  if (normalized.includes("too long")) {
    return "La nueva contraseña es demasiado larga"
  }
  return error.message ?? "No se pudo cambiar la contraseña"
}

/** Sign in con Better Auth (email + password). */
export async function signIn(input: { username: string; password: string }) {
  const result = await authClient.signIn.email({
    email: input.username,
    password: input.password,
    callbackURL: "/admin",
  })
  if (result.error) throw new Error(result.error.message ?? "Credenciales inválidas")
  return result.data
}

/** Sign out. */
export async function signOut() {
  await authClient.signOut()
}

export type ChangePasswordParams = {
  currentPassword: string
  newPassword: string
}

/** Change password for the signed-in user (Better Auth `/change-password`). */
export async function changePassword({ currentPassword, newPassword }: ChangePasswordParams) {
  const result = await authClient.changePassword({
    currentPassword,
    newPassword,
    revokeOtherSessions: false,
  })
  if (result.error) {
    throw new Error(formatChangePasswordError(result.error))
  }
  return result.data
}
