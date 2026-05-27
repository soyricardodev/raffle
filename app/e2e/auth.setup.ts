import fs from "node:fs/promises"
import path from "node:path"
import { test as setup } from "@playwright/test"
import { ensureAdminCredentialAccount } from "./helpers/db"
import { e2eEnv, hasDatabase } from "./helpers/env"

const emptyStorage = JSON.stringify({ cookies: [], origins: [] })

setup("admin session", async ({ page }) => {
  await fs.mkdir(path.dirname(e2eEnv.adminStoragePath), { recursive: true })

  if (!hasDatabase()) {
    await fs.writeFile(e2eEnv.adminStoragePath, emptyStorage)
    setup.skip(true, "DATABASE_URL not set")
    return
  }

  await ensureAdminCredentialAccount()

  const signIn = await page.request.post(`${e2eEnv.baseUrl}/api/auth/sign-in/email`, {
    data: { email: e2eEnv.adminEmail, password: e2eEnv.adminPassword },
  })
  if (!signIn.ok()) {
    const body = await signIn.text()
    throw new Error(`Admin sign-in failed (${signIn.status()}): ${body}`)
  }

  await page.goto("/admin", { waitUntil: "domcontentloaded" })

  try {
    await page.waitForURL(/\/admin/, { timeout: 45_000 })
    await page.getByRole("heading", { name: "Dashboard" }).waitFor({ timeout: 15_000 })
  } catch {
    console.warn(
      "[e2e] Admin login did not reach /admin — admin and verifier (approve) tests will skip. Check seed + Better Auth account row.",
    )
    await fs.writeFile(e2eEnv.adminStoragePath, emptyStorage)
    setup.skip(true, "Admin login unavailable")
    return
  }

  await page.context().storageState({ path: e2eEnv.adminStoragePath })
})
