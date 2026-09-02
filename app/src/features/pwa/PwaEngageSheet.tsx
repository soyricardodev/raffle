import { Bell, Check, Download, Smartphone, Sparkles, Ticket, Zap } from "lucide-react"
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

const NOTIFY_BENEFITS = [
  {
    icon: Sparkles,
    title: "Dinámicas y promociones",
    detail: "Las ves apenas salen, no cuando ya pasaron.",
  },
  {
    icon: Ticket,
    title: "Rifas nuevas",
    detail: "Te enteras más rápido que los demás.",
  },
  {
    icon: Bell,
    title: "Novedades",
    detail: "Lo que vamos a lanzar, directo a tu teléfono.",
  },
] as const

const INSTALL_BENEFITS = [
  {
    icon: Zap,
    title: "Un toque y estás dentro",
    detail: "Sin buscar el link ni abrir Instagram.",
  },
  {
    icon: Bell,
    title: "Los avisos te llegan igual",
    detail: "Promos, rifas y novedades, al instante.",
  },
  {
    icon: Smartphone,
    title: "Siempre a la mano",
    detail: "En tu pantalla de inicio, como cualquier app.",
  },
] as const

function blockedNotifySteps(platform: "ios" | "android" | "desktop") {
  if (platform === "ios") {
    return [
      { title: "Abre Ajustes", detail: "En tu iPhone, no dentro de la rifa." },
      { title: "Notificaciones", detail: `Busca ${PWA_NAME} y enciéndelas.` },
    ]
  }
  return [
    { title: "Toca el candado", detail: "Está junto a la dirección, arriba." },
    { title: "Notificaciones → Permitir", detail: "Luego vuelve y toca Ya los activé." },
  ]
}

type Engage = ReturnType<typeof usePwaEngage>

export function PwaEngageSheet({ engage }: { engage: Engage }) {
  const isInstall = engage.sheetKind === "install"
  const fromNotify = engage.installAfterNotify
  const blocked = engage.notifyBlocked && !isInstall
  const benefits = isInstall ? INSTALL_BENEFITS : NOTIFY_BENEFITS
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

        {fromNotify && isInstall ? (
          <div
            className={cn(
              "mx-5 mt-4 flex items-center gap-3 rounded-2xl border px-3.5 py-3",
              "border-emerald-500/35 bg-emerald-500/12",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_6px_16px_rgb(16_185_129_/_45%)]">
              <Check className="size-5" strokeWidth={2.5} aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold">Avisos activados</span>
              <span className="text-muted-foreground block text-xs leading-snug">
                Último paso: instala {PWA_NAME} en tu teléfono
              </span>
            </span>
          </div>
        ) : null}

        <div className="flex justify-center px-5 pt-4 pb-1">
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
          <p className="text-primary text-[11px] font-semibold tracking-wide uppercase">
            {engage.copy.eyebrow}
          </p>
          <SheetTitle className="text-[1.65rem] leading-tight font-semibold tracking-tight">
            {engage.copy.title}
          </SheetTitle>
          <SheetDescription className="text-left text-sm leading-relaxed">
            {engage.copy.description}
          </SheetDescription>
        </SheetHeader>

        <ul className="flex flex-col gap-2 px-5 py-4">
          {(steps ?? benefits).map((item, index) => (
            <li
              key={item.title}
              className="bg-muted/60 flex items-start gap-3 rounded-2xl px-3.5 py-3"
            >
              <span className="bg-primary/15 text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl">
                {steps ? (
                  <span className="text-sm font-semibold">{index + 1}</span>
                ) : "icon" in item ? (
                  <item.icon className="size-5" aria-hidden />
                ) : (
                  <Bell className="size-5" aria-hidden />
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
                  {item.detail}
                </span>
              </span>
            </li>
          ))}
        </ul>

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
