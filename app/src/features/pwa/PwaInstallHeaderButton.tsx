import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePwaEngageContext } from "@/features/pwa/pwa-engage-context"

export function PwaInstallHeaderButton() {
  const engage = usePwaEngageContext()
  if (!engage || engage.standalone || !engage.canOfferInstall) return null

  return (
    <Button
      type="button"
      size="sm"
      className="h-9 shrink-0 gap-1 px-2.5 text-xs font-semibold shadow-sm ring-2 ring-primary/40 transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] sm:h-10 sm:px-3 sm:text-sm"
      title="Instalar app"
      aria-label="Instalar app"
      disabled={engage.busy}
      onClick={() => void engage.promptInstall()}
    >
      <Download className="size-3.5 sm:size-4" aria-hidden />
      Instalar
    </Button>
  )
}
