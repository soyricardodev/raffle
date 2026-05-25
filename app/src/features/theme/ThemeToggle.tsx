import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/stores/theme"

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <Button variant="ghost" size="icon" onClick={toggle} title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      <span className="sr-only">{theme === "dark" ? "Modo claro" : "Modo oscuro"}</span>
    </Button>
  )
}
