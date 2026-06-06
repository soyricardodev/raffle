import {
  type AdminUserPreferences,
  type AdminUserPreferencesPatch,
  mergeAdminUserPreferences,
  parseAdminUserPreferences,
} from "@raffle/shared/admin/user-preferences"
import { users } from "@raffle/shared/db"
import { eq } from "drizzle-orm"
import { getDb } from "@/lib/db.server"

export async function getUserPreferences(userId: string): Promise<AdminUserPreferences> {
  const db = getDb()
  const [row] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return parseAdminUserPreferences(row?.preferences ?? null)
}

export async function updateUserPreferences(
  userId: string,
  patch: AdminUserPreferencesPatch,
): Promise<AdminUserPreferences> {
  const current = await getUserPreferences(userId)
  const next = mergeAdminUserPreferences(current, patch)

  const db = getDb()
  await db
    .update(users)
    .set({
      preferences: JSON.stringify(next),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  return next
}
