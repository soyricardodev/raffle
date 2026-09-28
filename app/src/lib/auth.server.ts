import { auditEvents, schema as dbSchema, users } from "@raffle/shared/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError } from "better-auth/api"
import { eq } from "drizzle-orm"
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
        schema: { ...authSchema, rateLimit: dbSchema.authRateLimits },
      }),
      user: {
        modelName: "users",
        fields: {
          name: "display_name",
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
        disableSignUp: true,
      },
      session: {
        // Session revocation and account deactivation must take effect on the next request.
        cookieCache: { enabled: false },
        expiresIn: 60 * 60 * 24,
      },
      databaseHooks: {
        user: {
          create: {
            // Future public sign-up must never inherit the legacy admin SQL default.
            before: async (user) => ({
              data: { ...user, username: user.email.toLowerCase(), role: "customer" },
            }),
          },
        },
        session: {
          create: {
            before: async (session) => {
              const [user] = await getDb()
                .select({ status: users.status })
                .from(users)
                .where(eq(users.id, session.userId))
                .limit(1)
              if (!user || user.status !== "active")
                throw new APIError("FORBIDDEN", { message: "Cuenta no disponible" })
            },
            after: async (session) => {
              await getDb()
                .update(users)
                .set({ lastLoginAt: new Date() })
                .where(eq(users.id, session.userId))
              await getDb()
                .insert(auditEvents)
                .values({ actorUserId: session.userId, action: "session.login" })
            },
          },
        },
      },
      rateLimit: {
        enabled: true,
        storage: "database",
        customRules: { "/sign-in/email": { window: 60, max: 5 } },
      },
      trustedOrigins: [...new Set([env.APP_URL, env.BETTER_AUTH_URL, ...devOrigins])],
    }) as unknown as ReturnType<typeof betterAuth>
  }
  return _auth
}
