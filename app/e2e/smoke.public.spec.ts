import { expect, test } from "@playwright/test"
import { hasDatabase } from "./helpers/env"

test.describe("public smoke", () => {
  test("home loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveTitle(/rifas/i)
    await expect(page.getByRole("navigation").getByRole("link", { name: "Verificar" })).toBeVisible()
  })

  test("/verificar page shows verifier UI", async ({ page }) => {
    await page.goto("/verificar", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-slot="card-title"]')).toHaveText("Verificar boletos")
    await expect(page.getByRole("button", { name: "Verificar boletos" })).toBeVisible()
    await expect(page.getByLabel("Teléfono")).toBeVisible()
  })

  test("admin login page loads", async ({ page }) => {
    test.skip(!hasDatabase(), "DATABASE_URL required for auth session check on /login")

    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await expect(page.locator('[data-slot="card-title"]')).toHaveText("Panel administrador")
    await expect(page.getByLabel("Email")).toBeVisible()
    await expect(page.getByLabel("Contraseña")).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
  })
})
