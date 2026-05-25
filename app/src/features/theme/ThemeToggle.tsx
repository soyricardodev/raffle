import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTheme } from "@/stores/theme"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setMode } = useTheme()
  const isDark = resolved === "dark"
  const label = isDark ? "Usar modo claro" : "Usar modo oscuro"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      title={label}
      aria-label={label}
      onClick={() => setMode(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  )
}
