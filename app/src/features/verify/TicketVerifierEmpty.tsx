import { MagnifyingGlassIcon, TicketIcon } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type TicketVerifierEmptyProps = {
  searchLabel: string
}

export function TicketVerifierEmpty({ searchLabel }: TicketVerifierEmptyProps) {
  return (
    <Card className="border-dashed bg-muted/15">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <div className="bg-muted flex size-14 items-center justify-center rounded-2xl">
          <TicketIcon className="text-muted-foreground size-7" weight="duotone" aria-hidden />
        </div>
        <div className="max-w-xs space-y-1.5">
          <p className="font-medium">No encontramos boletos</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Revisa que tu {searchLabel.toLowerCase()} coincida con el de la compra. Si acabas de
            pagar, puede tardar unos minutos en aparecer.
          </p>
        </div>
        <Button variant="outline" size="sm" className="min-h-10" asChild>
          <Link to="/">
            <MagnifyingGlassIcon className="mr-1.5 size-4" aria-hidden />
            Ver rifas activas
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
