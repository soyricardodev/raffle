import { Bell, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IosInstallSteps } from "@/features/pwa/IosInstallSteps"
import { PWA_ICON_192 } from "@/features/pwa/pwa-brand"
import {
  PWA_INSTALL_CTA,
  PWA_INSTALL_IOS_LINE,
  PWA_INSTALL_LINE,
  PWA_INSTALL_TITLE,
  PWA_NOTIFY_BLOCKED_DONE,
  PWA_NOTIFY_BLOCKED_TITLE,
  PWA_NOTIFY_CTA,
  PWA_NOTIFY_LINE,
  PWA_NOTIFY_TITLE,
} from "@/features/pwa/pwa-copy"
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
      aria-label={isInstall ? PWA_INSTALL_TITLE : PWA_NOTIFY_TITLE}
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
          <p className="text-sm leading-snug font-semibold">
            {isInstall
              ? PWA_INSTALL_TITLE
              : blocked
                ? PWA_NOTIFY_BLOCKED_TITLE
                : PWA_NOTIFY_TITLE}
          </p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {kind === "ios-install"
              ? PWA_INSTALL_IOS_LINE
              : isInstall
                ? PWA_INSTALL_LINE
                : blocked
                  ? "Toca el candado, Notificaciones, Permitir."
                  : PWA_NOTIFY_LINE}
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
              ? PWA_INSTALL_CTA
              : blocked
                ? PWA_NOTIFY_BLOCKED_DONE
                : PWA_NOTIFY_CTA}
        </Button>
      )}
    </section>
  )
}
