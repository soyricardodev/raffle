import { Bell, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IosInstallSteps } from "@/features/pwa/IosInstallSteps"
import { PWA_ICON_192, PWA_NAME } from "@/features/pwa/pwa-brand"
import { usePwaEngageContext } from "@/features/pwa/pwa-engage-context"
import { resolvePurchasePwaNudge } from "@/features/pwa/purchase-pwa-nudge"

export function PwaPurchaseNudge() {
  const engage = usePwaEngageContext()
  if (!engage) return null

  const kind = resolvePurchasePwaNudge({
    standalone: engage.standalone,
    notifyComplete: engage.notifyComplete,
    canOfferInstall: engage.canOfferInstall,
    canNotifyHere: engage.canNotifyHere,
    needsIosInstall: engage.needsIosInstall,
  })
  if (!kind) return null

  const isInstall = kind === "install" || kind === "ios-install"
  const blocked = kind === "notify" && engage.notifyBlocked

  return (
    <section
      aria-label={isInstall ? `Instalar ${PWA_NAME}` : "Activar avisos"}
      className="border-primary/35 mx-4 mb-3 overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 to-primary/5 p-3.5 shadow-[0_8px_24px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
    >
      <div className="flex items-start gap-3">
        {isInstall ? (
          <img
            src={PWA_ICON_192}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-[0.9rem] object-cover shadow-[0_6px_16px_rgba(0,0,0,0.22)] ring-2 ring-primary/45"
          />
        ) : (
          <span className="bg-primary text-primary-foreground mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-[0_6px_16px_color-mix(in_oklch,var(--primary)_35%,transparent)]">
            <Bell className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
            {kind === "ios-install"
              ? "En tu iPhone"
              : isInstall
                ? "Tus boletos, a un toque"
                : "Antes que el resto"}
          </p>
          <p className="mt-0.5 text-sm leading-snug font-semibold">
            {kind === "ios-install"
              ? `Pon ${PWA_NAME} en tu inicio`
              : isInstall
                ? `Instala ${PWA_NAME}`
                : blocked
                  ? "Enciende los avisos"
                  : "Activa los avisos"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {kind === "ios-install"
              ? "Toma 10 segundos. Ahí sí te llegan las rifas y las dinámicas."
              : isInstall
                ? "Ábrela sin buscar el link. Las rifas te llegan más rápido."
                : blocked
                  ? "Están apagados. Toca el candado junto a la dirección, Notificaciones, Permitir."
                  : "Así te enteras de dinámicas, promociones y rifas más rápido que los demás."}
          </p>
        </div>
      </div>

      {kind === "ios-install" ? (
        <div className="mt-3 rounded-2xl bg-background/70 px-3 py-3">
          <IosInstallSteps />
        </div>
      ) : null}

      {engage.error ? (
        <p className="text-destructive mt-2 text-xs" role="alert">
          {engage.error}
        </p>
      ) : null}

      {kind === "ios-install" ? null : (
        <Button
          size="sm"
          className="mt-3 h-11 w-full font-semibold shadow-sm transition-transform duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
          disabled={engage.busy}
          onClick={() => {
            if (kind === "install") {
              void engage.promptInstall()
              return
            }
            void engage.enableNotifications()
          }}
        >
          {kind === "install" ? (
            <Download className="size-3.5" aria-hidden />
          ) : (
            <Bell className="size-3.5" aria-hidden />
          )}
          {engage.busy
            ? "Espera…"
            : kind === "install"
              ? `Instalar ${PWA_NAME}`
              : blocked
                ? "Ya los activé"
                : "Activar avisos"}
        </Button>
      )}
    </section>
  )
}
