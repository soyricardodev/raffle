import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"

const PURCHASE_FORM_ID = "purchase-form"
const PURCHASE_PAYMENT_ID = "purchase-payment"
const VISIBILITY_THRESHOLD = 0.12

/** Show bar when the payment block is mostly off-screen (not only the form wrapper edge). */
function resolvePurchaseTarget(): HTMLElement | null {
  return (
    document.getElementById(PURCHASE_PAYMENT_ID) ??
    document.getElementById(PURCHASE_FORM_ID)
  )
}

export function HomeStickyCta({ visible }: { visible: boolean }) {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!visible) {
      setShow(false)
      return
    }

    let observer: IntersectionObserver | null = null
    let target: HTMLElement | null = null

    const attach = () => {
      target = resolvePurchaseTarget()
      if (!target) return false

      observer = new IntersectionObserver(
        ([entry]) => {
          setShow(entry.intersectionRatio < VISIBILITY_THRESHOLD)
        },
        {
          root: null,
          rootMargin: "-3.5rem 0px -5rem 0px",
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
    if (!visible || !show) {
      delete document.documentElement.dataset.stickyPurchaseCta
      return
    }
    document.documentElement.dataset.stickyPurchaseCta = "1"
    return () => {
      delete document.documentElement.dataset.stickyPurchaseCta
    }
  }, [visible, show])

  if (!mounted || !visible || !show) return null

  return createPortal(
    <div className="border-border/80 bg-background/95 pointer-events-none fixed inset-x-0 bottom-0 z-50 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
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
        >
          Ir a comprar
        </Button>
      </div>
    </div>,
    document.body,
  )
}
