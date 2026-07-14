import { MagnifyingGlassIcon, TicketIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  verifyTicketsCtaButtonClassName,
  verifyTicketsCtaCardClassName,
  verifyTicketsCtaHintClassName,
  verifyTicketsCtaIconClassName,
} from "@/features/raffle/purchase-form/field-styles"
import { loadSavedBuyerProfile } from "@/features/raffle/purchase-form/buyer-profile-storage"
import { buildVerifyHref } from "@/features/verify/build-verify-href"
import { maskPhoneTail } from "@/features/verify/verify-profile"

export function PurchaseVerifyTicketsCta() {
  const [savedPhone, setSavedPhone] = useState<string | null>(null)

  useEffect(() => {
    const profile = loadSavedBuyerProfile()
    setSavedPhone(profile?.customerPhone?.trim() || null)
  }, [])

  const verifyLink = savedPhone
    ? buildVerifyHref({ phone: savedPhone, auto: true })
    : buildVerifyHref()

  return (
    <Card data-testid="purchase-verify-cta" className={verifyTicketsCtaCardClassName}>
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        <div className="flex gap-3">
          <div className={verifyTicketsCtaIconClassName}>
            <TicketIcon className="size-5" weight="duotone" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium leading-snug">¿Ya compraste?</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Confirma tus números y revisa si tu pago ya fue aprobado.
            </p>
          </div>
        </div>

        {savedPhone ? (
          <p className={verifyTicketsCtaHintClassName}>
            Usaremos el teléfono de tu última compra ({maskPhoneTail(savedPhone)}).
          </p>
        ) : null}

        <Button variant="ghost" className={verifyTicketsCtaButtonClassName} asChild>
          <Link {...verifyLink}>
            <MagnifyingGlassIcon className="mr-2 size-5" weight="bold" aria-hidden />
            Buscar boletos
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
