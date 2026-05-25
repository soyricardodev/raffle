import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getDb } from "./db.server"
import { getEnv } from "./env"

let _auth: ReturnType<typeof betterAuth>

export function getAuth() {
  if (!_auth) {
    const env = getEnv()
    _auth = betterAuth({
      database: drizzleAdapter(getDb(), {
        provider: "mysql",
        usePlural: false,
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: false,
      },
      session: {
        cookieCache: { enabled: true, maxAge: 5 * 60 },
        expiresIn: 60 * 60 * 24,
      },
      trustedOrigins: [env.APP_URL],
    }) as unknown as ReturnType<typeof betterAuth>
  }
  return _auth
}
