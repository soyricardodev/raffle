import { CheckCircleIcon, UserCircleIcon } from "@phosphor-icons/react"
import { memo } from "react"
import { Button } from "@/components/ui/button"
import { buyerFirstName } from "@/features/raffle/purchase-form/buyer-profile-storage"

type SavedBuyerProfileBannerProps = {
  customerName: string
  dismissed: boolean
  disabled: boolean
  onUseOtherData: () => void
  onRestoreSavedProfile: () => void
}

export const SavedBuyerProfileBanner = memo(function SavedBuyerProfileBanner({
  customerName,
  dismissed,
  disabled,
  onUseOtherData,
  onRestoreSavedProfile,
}: SavedBuyerProfileBannerProps) {
  if (dismissed) {
    return (
      <div className="flex justify-end">
        <Button
          type="button"
          variant="link"
          size="xs"
          className="h-auto px-0 text-xs"
          disabled={disabled}
          onClick={onRestoreSavedProfile}
        >
          Volver a usar mis datos guardados
        </Button>
      </div>
    )
  }

  const firstName = buyerFirstName(customerName, "de nuevo")

  return (
    <div
      className="flex gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-3"
      role="status"
      aria-live="polite"
    >
      <CheckCircleIcon
        className="mt-0.5 size-6 shrink-0 text-emerald-600 dark:text-emerald-400"
        weight="fill"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <UserCircleIcon className="text-primary size-4 shrink-0" weight="duotone" aria-hidden />
          <p className="text-sm font-semibold">Hola, {firstName} — datos listos</p>
        </div>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Autocompletamos tu compra anterior. Solo revisa que nombre, teléfono y correo sigan
          correctos antes de pagar.
        </p>
        <Button
          type="button"
          variant="link"
          size="xs"
          className="text-muted-foreground hover:text-foreground mt-1.5 h-auto px-0 text-xs"
          disabled={disabled}
          onClick={onUseOtherData}
        >
          Usar otros datos
        </Button>
      </div>
    </div>
  )
})
