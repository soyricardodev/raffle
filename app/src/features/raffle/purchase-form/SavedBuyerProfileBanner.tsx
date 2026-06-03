import { UserCircleIcon } from "@phosphor-icons/react"
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
      className="border-primary/25 bg-primary/5 flex gap-2.5 rounded-lg border px-3 py-2.5"
      role="status"
      aria-live="polite"
    >
      <UserCircleIcon
        className="text-primary mt-0.5 size-5 shrink-0"
        weight="duotone"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium">Hola, {firstName}</p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          Completamos el formulario con los datos de tu última compra. Revisa que sigan correctos.
        </p>
        <Button
          type="button"
          variant="link"
          size="xs"
          className="text-muted-foreground hover:text-foreground mt-1 h-auto px-0 text-xs"
          disabled={disabled}
          onClick={onUseOtherData}
        >
          Usar otros datos
        </Button>
      </div>
    </div>
  )
})
