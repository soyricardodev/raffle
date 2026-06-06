import { z } from "zod"

export const AdminUserPurchasePreferencesSchema = z.object({
  skipApproveConfirm: z.boolean().default(false),
  skipTicketAdjustConfirm: z.boolean().default(false),
})

export type AdminUserPurchasePreferences = z.infer<typeof AdminUserPurchasePreferencesSchema>

export const AdminUserPreferencesSchema = z.object({
  purchases: AdminUserPurchasePreferencesSchema.default({
    skipApproveConfirm: false,
    skipTicketAdjustConfirm: false,
  }),
})

export type AdminUserPreferences = z.infer<typeof AdminUserPreferencesSchema>

export const AdminUserPreferencesPatchSchema = z.object({
  purchases: z
    .object({
      skipApproveConfirm: z.boolean().optional(),
      skipTicketAdjustConfirm: z.boolean().optional(),
    })
    .optional(),
})

export type AdminUserPreferencesPatch = z.infer<typeof AdminUserPreferencesPatchSchema>

export const DEFAULT_ADMIN_USER_PREFERENCES: AdminUserPreferences = {
  purchases: {
    skipApproveConfirm: false,
    skipTicketAdjustConfirm: false,
  },
}

export function parseAdminUserPreferences(raw: unknown): AdminUserPreferences {
  if (raw == null || raw === "") {
    return { ...DEFAULT_ADMIN_USER_PREFERENCES, purchases: { ...DEFAULT_ADMIN_USER_PREFERENCES.purchases } }
  }

  let parsed: unknown = raw
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { ...DEFAULT_ADMIN_USER_PREFERENCES, purchases: { ...DEFAULT_ADMIN_USER_PREFERENCES.purchases } }
    }
  }

  const result = AdminUserPreferencesSchema.safeParse(parsed)
  if (!result.success) {
    return { ...DEFAULT_ADMIN_USER_PREFERENCES, purchases: { ...DEFAULT_ADMIN_USER_PREFERENCES.purchases } }
  }

  return result.data
}

export function mergeAdminUserPreferences(
  current: AdminUserPreferences,
  patch: AdminUserPreferencesPatch,
): AdminUserPreferences {
  const next: AdminUserPreferences = {
    purchases: { ...current.purchases },
  }

  if (patch.purchases?.skipApproveConfirm !== undefined) {
    next.purchases.skipApproveConfirm = patch.purchases.skipApproveConfirm
  }
  if (patch.purchases?.skipTicketAdjustConfirm !== undefined) {
    next.purchases.skipTicketAdjustConfirm = patch.purchases.skipTicketAdjustConfirm
  }

  return AdminUserPreferencesSchema.parse(next)
}

export function shouldSkipPurchaseApproveConfirm(preferences: AdminUserPreferences): boolean {
  return preferences.purchases.skipApproveConfirm
}

export function shouldSkipPurchaseTicketAdjustConfirm(preferences: AdminUserPreferences): boolean {
  return preferences.purchases.skipTicketAdjustConfirm
}
