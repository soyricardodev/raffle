import { Bell, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PWA_ICON_192, PWA_NAME } from "@/features/pwa/pwa-brand"
import type { usePwaEngage } from "@/features/pwa/use-pwa-engage"
import { cn } from "@/lib/utils"

function blockedNotifySteps(platform: "ios" | "android" | "desktop") {
  if (platform === "ios") {
    return [
      { title: "Abre Ajustes", detail: "En tu iPhone, no dentro de la rifa." },
      { title: "Notificaciones", detail: `Busca ${PWA_NAME} y enciéndelas.` },
    ]
  }
  return [
    { title: "Toca el candado", detail: "Está junto a la dirección, arriba." },
    { title: "Notificaciones → Permitir", detail: "Luego vuelve y toca Ya las activé." },
  ]
}

type Engage = ReturnType<typeof usePwaEngage>

export function PwaEngageSheet({ engage }: { engage: Engage }) {
  const isInstall = engage.sheetKind === "install"
  const blocked = engage.notifyBlocked && !isInstall
  const steps = blocked ? blockedNotifySteps(engage.platform) : null

  return (
    <Sheet
      open={engage.sheetOpen && !engage.iosGuideOpen}
      onOpenChange={(open) => {
        if (open) return
        engage.closeSheet(true)
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton
        className="flex max-h-[94dvh] flex-col gap-0 overflow-y-auto rounded-t-3xl p-0 duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:mx-auto sm:max-w-lg"
      >
        <div className="bg-muted-foreground/25 mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full" />

        <div className="flex justify-center px-5 pt-5 pb-1">
          {isInstall ? (
            <img
              src={PWA_ICON_192}
              alt=""
              width={72}
              height={72}
              className="size-[4.5rem] rounded-[1.35rem] object-cover shadow-[0_10px_28px_rgba(0,0,0,0.28)] ring-2 ring-primary/50"
            />
          ) : (
            <span className="relative flex size-16 items-center justify-center">
              <span className="bg-primary/35 absolute inset-0 rounded-[1.35rem] blur-lg" />
              <span className="bg-primary text-primary-foreground relative flex size-14 items-center justify-center rounded-2xl shadow-[0_10px_28px_color-mix(in_oklch,var(--primary)_40%,transparent)]">
                <Bell className="size-7" aria-hidden />
              </span>
            </span>
          )}
        </div>

        <SheetHeader className="shrink-0 gap-2 px-5 pt-3 pr-12 pb-1 text-left">
          <SheetTitle className="text-[1.65rem] leading-tight font-semibold tracking-tight">
            {engage.copy.title}
          </SheetTitle>
          <SheetDescription className="text-left text-sm leading-relaxed">
            {engage.copy.description}
          </SheetDescription>
        </SheetHeader>

        {steps ? (
          <ol className="flex flex-col gap-2 px-5 py-4">
            {steps.map((item, index) => (
              <li key={item.title} className="bg-muted/60 flex items-start gap-3 rounded-2xl px-3.5 py-3">
                <span className="bg-primary/15 text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{item.title}</span>
                  <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                    {item.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="h-4" />
        )}

        {engage.error ? (
          <p className="text-destructive px-5 pb-2 text-sm" role="alert">
            {engage.error}
          </p>
        ) : null}

        <div
          className="flex shrink-0 flex-col gap-2 px-5 pt-1"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
        >
          <Button
            size="lg"
            className="min-h-12 w-full text-base font-semibold shadow-[0_8px_20px_color-mix(in_oklch,var(--primary)_35%,transparent)] transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
            disabled={engage.busy || (isInstall && !engage.canOfferInstall)}
            onClick={() => void engage.runPrimary()}
          >
            {isInstall ? (
              <Download className="size-4" aria-hidden />
            ) : (
              <Bell className="size-4" aria-hidden />
            )}
            {engage.busy ? "Espera…" : engage.copy.primaryLabel}
          </Button>

          <button
            type="button"
            className={cn(
              "text-muted-foreground min-h-11 text-center text-xs underline-offset-4",
              "hover:text-foreground hover:underline",
            )}
            onClick={() => engage.closeSheet(true)}
          >
            Ahora no
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
