import { create } from "zustand"

export type ThemeMode = "light" | "dark" | "system"
export type ResolvedTheme = "light" | "dark"

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", resolved === "dark")
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system"
  const stored = localStorage.getItem("theme")
  if (stored === "light" || stored === "dark" || stored === "system") return stored
  return "system"
}

interface ThemeStore {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  syncSystem: () => void
}

// Always start with "system" so SSR and the first client render match.
// RootDocument syncs from localStorage after hydration.
const initialMode: ThemeMode = "system"
const initialResolved: ResolvedTheme = "light"

export const useTheme = create<ThemeStore>((set, get) => ({
  mode: initialMode,
  resolved: initialResolved,
  setMode: (mode) => {
    localStorage.setItem("theme", mode)
    const resolved = resolveTheme(mode)
    applyThemeClass(resolved)
    set({ mode, resolved })
  },
  syncSystem: () => {
    if (get().mode !== "system") return
    const resolved = getSystemTheme()
    applyThemeClass(resolved)
    set({ resolved })
  },
}))

if (typeof window !== "undefined") {
  applyThemeClass(resolveTheme(readStoredMode()))
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    useTheme.getState().syncSystem()
  })
}
