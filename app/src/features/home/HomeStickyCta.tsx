import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import {
  PUBLIC_FOOTER_LEGAL_ID,
  setStickyPurchaseCtaActive,
} from "@/features/layout/sticky-purchase-cta"

const PURCHASE_FORM_ID = "purchase-form"
const PURCHASE_PAYMENT_ID = "purchase-payment"
const VISIBILITY_THRESHOLD = 0.12

/** IntersectionObserver only accepts px or % in rootMargin (not rem). */
function rootMarginPx(topRem: number, bottomRem: number): string {
  const rootFontSize = parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  )
  const pxPerRem = Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : 16
  const top = Math.round(topRem * pxPerRem)
  const bottom = Math.round(bottomRem * pxPerRem)
  return `-${top}px 0px -${bottom}px 0px`
}

function resolvePurchaseTarget(): HTMLElement | null {
  return (
    document.getElementById(PURCHASE_PAYMENT_ID) ??
    document.getElementById(PURCHASE_FORM_ID)
  )
}

export function HomeStickyCta({ visible }: { visible: boolean }) {
  const barRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [barHeight, setBarHeight] = useState(0)
  const [purchaseOnScreen, setPurchaseOnScreen] = useState(false)
  const [footerLegalNear, setFooterLegalNear] = useState(false)

  const showBar = visible && !purchaseOnScreen && !footerLegalNear && barHeight > 0

  useEffect(() => {
    setMounted(true)
  }, [])

  const measureBar = useCallback(() => {
    const height = barRef.current?.getBoundingClientRect().height ?? 0
    setBarHeight(height)
    return height
  }, [])

  useEffect(() => {
    if (!mounted || !visible) {
      setBarHeight(0)
      return
    }

    const bar = barRef.current
    if (!bar) return

    measureBar()
    const ro = new ResizeObserver(() => measureBar())
    ro.observe(bar)
    return () => ro.disconnect()
  }, [mounted, visible, measureBar])

  useEffect(() => {
    if (!visible) {
      setPurchaseOnScreen(false)
      return
    }

    let observer: IntersectionObserver | null = null

    const attach = () => {
      const target = resolvePurchaseTarget()
      if (!target) return false

      observer = new IntersectionObserver(
        ([entry]) => {
          setPurchaseOnScreen(entry.intersectionRatio >= VISIBILITY_THRESHOLD)
        },
        {
          root: null,
          rootMargin: rootMarginPx(3.5, 5),
          threshold: [0, 0.05, 0.12, 0.25, 0.5, 1],
        },
      )
      observer.observe(target)
      return true
    }

    if (!attach()) {
      const retry = window.setInterval(() => {
        if (attach()) window.clearInterval(retry)
      }, 200)
      return () => {
        window.clearInterval(retry)
        observer?.disconnect()
      }
    }

    return () => observer?.disconnect()
  }, [visible])

  useEffect(() => {
    if (!visible || barHeight <= 0) {
      setFooterLegalNear(false)
      return
    }

    const legal = document.getElementById(PUBLIC_FOOTER_LEGAL_ID)
    if (!legal) return

    const bottomInset = Math.ceil(barHeight) + 8
    const observer = new IntersectionObserver(
      ([entry]) => setFooterLegalNear(entry.isIntersecting),
      {
        root: null,
        rootMargin: `0px 0px -${bottomInset}px 0px`,
        threshold: 0,
      },
    )
    observer.observe(legal)
    return () => observer.disconnect()
  }, [visible, barHeight])

  useEffect(() => {
    setStickyPurchaseCtaActive(showBar, barHeight)
  }, [showBar, barHeight])

  useEffect(() => {
    if (!visible) setStickyPurchaseCtaActive(false)
  }, [visible])

  if (!mounted || !visible) return null

  return createPortal(
    <div
      ref={barRef}
      data-sticky-purchase-bar
      aria-hidden={!showBar}
      className={[
        "border-border/80 bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md transition-[transform,opacity] duration-300 ease-out dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]",
        showBar
          ? "pointer-events-none translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0",
      ].join(" ")}
    >
      <div className="pointer-events-auto mx-auto max-w-lg">
        <Button
          className="min-h-11 w-full font-semibold text-white shadow-md"
          style={{ backgroundColor: "var(--brand-primary)" }}
          onClick={() =>
            document.getElementById(PURCHASE_FORM_ID)?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          tabIndex={showBar ? 0 : -1}
        >
          Ir a comprar
        </Button>
      </div>
    </div>,
    document.body,
  )
}
