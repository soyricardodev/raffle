import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

export function HomeStickyCta({ visible }: { visible: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!visible) {
      setShow(false)
      return
    }

    const target = document.getElementById("comprar")
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { rootMargin: "-72px 0px 0px 0px", threshold: 0 },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [visible])

  if (!visible || !show) return null

  return (
    <div className="border-border/80 bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
      <div className="mx-auto max-w-lg">
        <Button
          className="min-h-11 w-full font-semibold text-white"
          style={{ backgroundColor: "var(--brand-primary)" }}
          onClick={() =>
            document.getElementById("comprar")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          Ir a comprar
        </Button>
      </div>
    </div>
  )
}
