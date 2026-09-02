import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { IosInstallSteps } from "@/features/pwa/IosInstallSteps"
import { PWA_NAME } from "@/features/pwa/pwa-brand"
import type { usePwaEngage } from "@/features/pwa/use-pwa-engage"

export function IosInstallGuide({ engage }: { engage: ReturnType<typeof usePwaEngage> }) {
  if (engage.platform !== "ios") return null

  return (
    <Sheet open={engage.iosGuideOpen} onOpenChange={engage.setIosGuideOpen}>
      <SheetContent
        side="bottom"
        showCloseButton
        className="flex flex-col gap-0 rounded-t-3xl p-0 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:mx-auto sm:max-w-lg"
      >
        <SheetHeader className="gap-2 px-5 pt-5 pr-12 pb-2 text-left">
          <p className="text-primary text-[11px] font-semibold tracking-wide uppercase">iPhone</p>
          <SheetTitle className="text-xl leading-snug font-semibold tracking-tight">
            Agrégala a tu pantalla de inicio
          </SheetTitle>
          <SheetDescription className="text-left text-sm leading-relaxed">
            En iPhone no hay otro camino. Toma 10 segundos, abre {PWA_NAME} y activa los avisos.
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 py-4">
          <IosInstallSteps />
        </div>

        <div
          className="px-5 pt-1"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          <Button
            size="lg"
            className="min-h-12 w-full text-base font-semibold transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
            onClick={() => {
              engage.setIosGuideOpen(false)
              engage.closeSheet(true)
            }}
          >
            Entendido
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
