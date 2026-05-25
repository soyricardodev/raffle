import type { UserRole } from "@raffle/shared/validators"
import type { AuthSession } from "./types"

type BetterAuthUser = {
  id: string | number
  email: string
  name?: string | null
  username?: string | null
  role?: string | null
}

type BetterAuthSession = {
  user: BetterAuthUser
}

export function mapAuthSession(session: BetterAuthSession | null | undefined): AuthSession | null {
  if (!session?.user) return null

  const role = (session.user.role ?? "admin") as UserRole

  return {
    user: {
      id: Number(session.user.id) || 0,
      username: session.user.username ?? session.user.name ?? session.user.email,
      role,
    },
  }
}
