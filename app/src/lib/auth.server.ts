import { schema as dbSchema } from "@raffle/shared/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { getDb } from "./db.server"
import { getEnv } from "./env"

/** Better Auth model names (singular) → Drizzle exports. */
const authSchema = {
  ...dbSchema,
  user: dbSchema.users,
  session: dbSchema.sessions,
  account: dbSchema.accounts,
  verification: dbSchema.verifications,
}

let _auth: ReturnType<typeof betterAuth>

export function getAuth() {
  if (!_auth) {
    const env = getEnv()
    const devOrigins =
      env.NODE_ENV === "development"
        ? [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            `http://localhost:${process.env.E2E_PORT ?? "3100"}`,
            `http://127.0.0.1:${process.env.E2E_PORT ?? "3100"}`,
            "http://localhost:3002",
            "http://127.0.0.1:3002",
          ]
        : []

    _auth = betterAuth({
      baseURL: env.BETTER_AUTH_URL,
      database: drizzleAdapter(getDb(), {
        provider: "sqlite",
        schema: authSchema,
      }),
      user: {
        modelName: "users",
        fields: {
          name: "username",
          emailVerified: "email_verified",
        },
        additionalFields: {
          role: {
            type: "string",
            required: false,
            input: false,
          },
        },
      },
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
