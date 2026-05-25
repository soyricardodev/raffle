import { create } from "zustand"

type Theme = "light" | "dark"

interface ThemeStore {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const getInitial = (): Theme => {
  if (typeof window === "undefined") return "light"
  const stored = localStorage.getItem("theme") as Theme | null
  if (stored === "dark" || stored === "light") return stored
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export const useTheme = create<ThemeStore>((set, get) => ({
  theme: getInitial(),
  setTheme: (theme) => {
    localStorage.setItem("theme", theme)
    document.documentElement.classList.toggle("dark", theme === "dark")
    set({ theme })
  },
  toggle: () => {
    const next = get().theme === "dark" ? "light" : "dark"
    get().setTheme(next)
  },
}))
