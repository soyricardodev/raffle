import fs from "node:fs"
import { expect } from "@playwright/test"
import { ensureAdminCredentialAccount } from "./helpers/db"
import { describeWithDb, test } from "./helpers/fixtures"
import { e2eEnv } from "./helpers/env"

function hasAdminSession(): boolean {
  try {
    const raw = fs.readFileSync(e2eEnv.adminStoragePath, "utf8")
    const state = JSON.parse(raw) as { cookies?: unknown[] }
    return (state.cookies?.length ?? 0) > 0
  } catch {
    return false
  }
}

describeWithDb("admin change password", () => {
  test.afterEach(async () => {
    await ensureAdminCredentialAccount()
  })

  test("updates password, signs out, and signs in with the new password", async ({ page }) => {
    test.skip(!hasAdminSession(), "Admin session missing — see docs/E2E.md")

    const newPassword = `${e2eEnv.adminPassword}2`

    await page.goto("/admin/cuenta", { waitUntil: "domcontentloaded" })
    await page.waitForURL(/\/(admin\/cuenta|login)/, { timeout: 15_000 })
    test.skip(page.url().includes("/login"), "Admin session expired")

    await page.getByLabel("Contraseña actual").fill(e2eEnv.adminPassword)
    await page.getByLabel("Nueva contraseña", { exact: true }).fill(newPassword)
    await page.getByLabel("Confirmar nueva contraseña").fill(newPassword)
    await page.getByRole("button", { name: "Actualizar contraseña" }).click()

    await page.waitForURL(/\/login/, { timeout: 15_000 })

    await page.getByLabel("Email").fill(e2eEnv.adminEmail)
    await page.getByLabel("Contraseña").fill(newPassword)
    await page.getByRole("button", { name: "Entrar" }).click()

    await page.waitForURL(/\/admin/, { timeout: 45_000 })
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 15_000,
    })
  })
})
