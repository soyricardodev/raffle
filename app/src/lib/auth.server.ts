import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getDb } from "./db.server"
import { getEnv } from "./env"

let _auth: ReturnType<typeof betterAuth>

export function getAuth() {
  if (!_auth) {
    const env = getEnv()
    const devOrigins =
      env.NODE_ENV === "development"
        ? [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
          ]
        : []

    _auth = betterAuth({
      baseURL: env.BETTER_AUTH_URL,
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
      trustedOrigins: [...new Set([env.APP_URL, env.BETTER_AUTH_URL, ...devOrigins])],
    }) as unknown as ReturnType<typeof betterAuth>
  }
  return _auth
}
