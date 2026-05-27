import { TanStackDevtools } from "@tanstack/react-devtools"
import { QueryClientProvider } from "@tanstack/react-query"
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import { queryClient } from "@/lib/query-client"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { Toaster } from "sonner"

import { useEffect, useLayoutEffect } from "react"
import { useTheme } from "@/stores/theme"

import appCss from "../styles.css?url"

// Script inline para evitar flash de modo oscuro — se ejecuta ANTES del render
const themeScript = `
(function() {
  var theme = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var dark = theme === 'dark' || ((theme === 'system' || !theme) && prefersDark);
  if (dark) document.documentElement.classList.add('dark');
})()
`

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Rifas" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [{ children: themeScript }],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-muted-foreground">La página solicitada no existe.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { mode, setMode, syncSystem } = useTheme()

  useLayoutEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored === "dark" || stored === "light" || stored === "system") {
      setMode(stored)
    } else {
      setMode("system")
    }
  }, [setMode])

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => syncSystem()
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [mode, syncSystem])

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors closeButton position="top-center" />
        </QueryClientProvider>
        {import.meta.env.DEV ? (
          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[{ name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> }]}
          />
        ) : null}
        <Scripts />
      </body>
    </html>
  )
}
