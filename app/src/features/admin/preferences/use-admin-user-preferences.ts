import {
  type AdminUserPreferences,
  type AdminUserPurchasePreferences,
  DEFAULT_ADMIN_USER_PREFERENCES,
  shouldSkipPurchaseApproveConfirm,
  shouldSkipPurchaseTicketAdjustConfirm,
} from "@raffle/shared/admin/user-preferences"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  adminUserPreferencesQueryKey,
  adminUserPreferencesQueryOptions,
} from "@/features/admin/preferences/admin-user-preferences-queries"
import { adminFetch } from "@/lib/admin-fetch"

export { shouldSkipPurchaseApproveConfirm, shouldSkipPurchaseTicketAdjustConfirm }

type PurchasePreferenceKey = keyof AdminUserPurchasePreferences

export function useAdminUserPreferences() {
  const queryClient = useQueryClient()
  const query = useQuery(adminUserPreferencesQueryOptions())

  const mutation = useMutation({
    mutationFn: (patch: { purchases: Partial<AdminUserPurchasePreferences> }) =>
      adminFetch<AdminUserPreferences>("/api/admin/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: adminUserPreferencesQueryKey })
      const previous = queryClient.getQueryData<AdminUserPreferences>(adminUserPreferencesQueryKey)
      const current = previous ?? DEFAULT_ADMIN_USER_PREFERENCES
      const optimistic: AdminUserPreferences = {
        purchases: {
          ...current.purchases,
          ...patch.purchases,
        },
      }
      queryClient.setQueryData(adminUserPreferencesQueryKey, optimistic)
      return { previous }
    },
    onError: (error: Error, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminUserPreferencesQueryKey, context.previous)
      }
      toast.error(error.message)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(adminUserPreferencesQueryKey, data)
    },
  })

  function updatePurchasePreference(key: PurchasePreferenceKey, value: boolean) {
    mutation.mutate({ purchases: { [key]: value } })
  }

  const preferences = query.data ?? DEFAULT_ADMIN_USER_PREFERENCES

  return {
    preferences,
    isLoading: query.isPending,
    isUpdating: mutation.isPending,
    updatePurchasePreference,
    skipApproveConfirm: shouldSkipPurchaseApproveConfirm(preferences),
    skipTicketAdjustConfirm: shouldSkipPurchaseTicketAdjustConfirm(preferences),
  }
}
