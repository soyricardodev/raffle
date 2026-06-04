import { expect, test } from "@playwright/test"
import { hasDatabase } from "./helpers/env"

test.describe("public smoke", () => {
  test("home loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveTitle(/rifas/i)
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Verificar Boletos" }),
    ).toBeVisible()
  })

  test("home shows live activity ticker when applicable", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    const ticker = page.getByTestId("live-purchase-activity-ticker")
    await expect(ticker).toBeVisible()
    await expect(ticker).toHaveAttribute("data-variant", /^(live|idle|finished)$/)
  })

  test("/verificar page shows verifier UI", async ({ page }) => {
    await page.goto("/verificar", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveTitle(/Verificar boletos/i)
    await expect(page.getByRole("heading", { name: "Verificar boletos" })).toBeVisible()
    const quickSearch = page.getByRole("button", { name: /ver mis boletos/i })
    const manualSearch = page.getByRole("button", { name: "Buscar boletos" })
    await expect(quickSearch.or(manualSearch)).toBeVisible()
  })

  test("admin login page loads", async ({ page }) => {
    test.skip(!hasDatabase(), "DATABASE_URL required for auth session check on /login")

    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveTitle(/Iniciar sesión/i)
    await expect(page.locator('[data-slot="card-title"]')).toHaveText("Panel administrador")
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Contraseña")).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
  })
})
