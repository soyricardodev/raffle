import { useNavigate, useRouterState } from "@tanstack/react-router"
import { Bell, BellRing, CheckCheck, Megaphone, Percent, Ticket } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  formatInboxTime,
  formatUnreadBadge,
  type PushInboxItem,
  previewAvisosEnabled,
} from "@/features/pwa/push-inbox-format"
import { usePwaEngageContext } from "@/features/pwa/pwa-engage-context"
import { usePushInbox } from "@/features/pwa/use-push-inbox"
import { cn } from "@/lib/utils"

const EASE_OUT = "cubic-bezier(0.23,1,0.32,1)"
const EASE_DRAWER = "cubic-bezier(0.32,0.72,0,1)"

export function PushInboxBell() {
  const engage = usePwaEngageContext()
  const preview = useRouterState({
    select: (state) => previewAvisosEnabled(state.location.search),
  })
  const subscribed = Boolean(engage?.ready && engage.notifyComplete)
  const visible = preview || subscribed
  const [open, setOpen] = useState(false)
  const { inbox, loading, markRead } = usePushInbox({ enabled: visible, preview })
  const navigate = useNavigate()
  const badge = formatUnreadBadge(inbox.unreadCount)

  if (!visible) return null

  const hasUnread = inbox.unreadCount > 0
  const shouldRing = hasUnread && !open

  const openInbox = () => setOpen(true)

  const selectItem = (item: PushInboxItem) => {
    if (!item.read) {
      markRead({ ids: [item.id] })
      return
    }
    const url = item.url?.trim() || "/"
    if (url === "/" || url === window.location.pathname) return
    setOpen(false)
    if (/^https?:\/\//i.test(url)) {
      window.location.assign(url)
      return
    }
    void navigate({ to: url })
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="relative shrink-0 transition-transform duration-160 active:scale-[0.97]"
        style={{ transitionTimingFunction: EASE_OUT }}
        title={badge ? `${badge} avisos nuevos` : "Avisos"}
        aria-label={badge ? `Avisos, ${inbox.unreadCount} sin leer` : "Avisos"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={openInbox}
      >
        <span className="push-inbox-bell-clapper" data-ring={shouldRing ? "true" : undefined}>
          {hasUnread ? (
            <BellRing className="size-5" aria-hidden />
          ) : (
            <Bell className="size-5" aria-hidden />
          )}
        </span>
        {badge ? (
          <span
            className={cn(
              "push-inbox-bell-badge bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1",
              "text-[10px] leading-none font-bold tracking-tight tabular-nums",
              "shadow-[0_0_0_2px_var(--background)]",
              "origin-center transition-[transform,opacity] duration-160",
              "@starting-style:scale-95 @starting-style:opacity-0",
            )}
            data-ring={shouldRing ? "true" : undefined}
            style={{ transitionTimingFunction: EASE_OUT }}
          >
            {badge}
          </span>
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-t-3xl p-0 sm:mx-auto sm:max-w-lg"
          style={{ transitionDuration: "280ms", transitionTimingFunction: EASE_DRAWER }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="bg-muted-foreground/25 mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full" />

          <SheetHeader className="flex-row items-start justify-between gap-3 px-5 pt-4 pr-12 pb-2 text-left">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-[1.45rem] leading-tight font-semibold tracking-tight">
                Avisos
              </SheetTitle>
              <SheetDescription className="text-left text-sm" aria-live="polite">
                {inbox.unreadCount > 0
                  ? inbox.unreadCount === 1
                    ? "Tienes 1 aviso sin leer"
                    : `Tienes ${inbox.unreadCount} avisos sin leer`
                  : "Todo al día"}
              </SheetDescription>
            </div>
            {inbox.unreadCount > 0 ? (
              <button
                type="button"
                className={cn(
                  "text-primary mt-1 shrink-0 text-xs font-semibold underline-offset-4",
                  "transition-transform duration-160 active:scale-[0.97]",
                  "[@media(hover:hover)_and_(pointer:fine)]:hover:underline",
                )}
                style={{ transitionTimingFunction: EASE_OUT }}
                onClick={() => markRead({ all: true })}
              >
                <span className="inline-flex items-center gap-1">
                  <CheckCheck className="size-3.5" aria-hidden />
                  Marcar todas
                </span>
              </button>
            ) : null}
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {loading && inbox.items.length === 0 ? (
              <div className="flex flex-col gap-2 px-1 py-2">
                <InboxSkeleton />
                <InboxSkeleton />
                <InboxSkeleton />
              </div>
            ) : inbox.items.length === 0 ? (
              <EmptyInbox />
            ) : (
              <ul className="flex flex-col gap-1.5 pt-1">
                {inbox.items.map((item, index) => (
                  <li
                    key={item.id}
                    className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-reduce:animate-none"
                    style={{
                      animationDuration: "200ms",
                      animationDelay: `${Math.min(index, 7) * 40}ms`,
                      animationTimingFunction: EASE_OUT,
                    }}
                  >
                    <InboxRow item={item} onSelect={() => selectItem(item)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function InboxRow({ item, onSelect }: { item: PushInboxItem; onSelect: () => void }) {
  const Icon = inboxKindIcon(item.kind)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left",
        "transition-[transform,background-color] duration-200",
        "active:scale-[0.98]",
        item.read
          ? "bg-transparent [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/60"
          : "bg-primary/10",
      )}
      style={{ transitionTimingFunction: EASE_OUT }}
    >
      <span
        className={cn(
          "relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
          "transition-[background-color,color] duration-200",
          item.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
        )}
        style={{ transitionTimingFunction: EASE_OUT }}
      >
        <Icon className="size-4" aria-hidden />
        <span
          className={cn(
            "bg-primary absolute -top-0.5 -right-0.5 size-2 rounded-full shadow-[0_0_0_2px_var(--background)]",
            "transition-[opacity,transform] duration-160",
            item.read ? "scale-95 opacity-0" : "scale-100 opacity-100",
          )}
          style={{ transitionTimingFunction: EASE_OUT }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "text-sm leading-snug transition-[color] duration-200",
              item.read ? "text-foreground/80 font-medium" : "font-semibold",
            )}
            style={{ transitionTimingFunction: EASE_OUT }}
          >
            {item.title}
          </span>
          <time
            className="text-muted-foreground mt-0.5 shrink-0 text-[11px] tabular-nums"
            dateTime={item.createdAt}
          >
            {formatInboxTime(item.createdAt)}
          </time>
        </span>
        <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
          {item.body}
        </span>
      </span>
    </button>
  )
}

function EmptyInbox() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
        <Bell className="size-6" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold">Todavía no hay avisos</p>
      <p className="text-muted-foreground mt-1 max-w-[16rem] text-xs leading-relaxed">
        Cuando salga una rifa o una promo, te llega aquí.
      </p>
    </div>
  )
}

function InboxSkeleton() {
  return <div className="bg-muted/70 h-[4.25rem] animate-pulse rounded-2xl" />
}

function inboxKindIcon(kind: string) {
  if (kind === "promotion") return Percent
  if (kind === "manual") return Megaphone
  return Ticket
}
