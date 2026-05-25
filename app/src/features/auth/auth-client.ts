import { createAuthClient } from "better-auth/react"
import type { AuthSession } from "./types"

/** Better Auth client — singleton compartido. */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
})

/** Client-side session para compatibilidad con guards legacy. */
export function getClientSession(): AuthSession | null {
  if (typeof window === "undefined") return null
  // La sesión real viene de la cookie httpOnly, no de sessionStorage.
  // Esto es un helper temporal para los route guards.
  return null
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
