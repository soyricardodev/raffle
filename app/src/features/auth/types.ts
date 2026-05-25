export type UserRole = "admin" | "super_admin"

export type AuthUser = {
  id: number
  username: string
  role: UserRole
}

export type AuthSession = {
  user: AuthUser
}

export type SignInInput = {
  username: string
  password: string
}
