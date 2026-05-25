import type { AuthSession, SignInInput } from "./types"

const DEV_SESSION_KEY = "raffle_dev_session"

/** Client-side session read — replaced by Better Auth (T-008). */
export function getClientSession(): AuthSession | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(DEV_SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    sessionStorage.removeItem(DEV_SESSION_KEY)
    return null
  }
}

export function setClientSession(session: AuthSession): void {
  sessionStorage.setItem(DEV_SESSION_KEY, JSON.stringify(session))
}

export function clearClientSession(): void {
  sessionStorage.removeItem(DEV_SESSION_KEY)
}

/**
 * Dev stub until DeepSeek wires Better Auth.
 * Any non-empty credentials work in DEV for UI testing without DATABASE_URL.
 */
export async function signIn(input: SignInInput): Promise<AuthSession> {
  const username = input.username.trim()
  const password = input.password

  if (!username || !password) {
    throw new Error("Usuario y contraseña son requeridos")
  }

  if (import.meta.env.DEV) {
    const session: AuthSession = {
      user: {
        id: 1,
        username,
        role: username === "super" ? "super_admin" : "admin",
      },
    }
    setClientSession(session)
    return session
  }

  throw new Error("Autenticación no configurada. Pendiente Better Auth (T-008).")
}

export async function signOut(): Promise<void> {
  clearClientSession()
}
