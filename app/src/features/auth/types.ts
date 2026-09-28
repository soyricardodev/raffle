export type UserRole = "admin" | "super_admin" | (string & {})

export type AuthUser = {
  id: string
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
