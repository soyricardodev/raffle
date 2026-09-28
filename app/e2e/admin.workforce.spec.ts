import fs from "node:fs"
import { expect, request as playwrightRequest } from "@playwright/test"
import { e2eEnv } from "./helpers/env"
import { describeWithDb, test } from "./helpers/fixtures"

const sameOrigin = { Origin: e2eEnv.baseUrl }

describeWithDb("workforce onboarding", () => {
  test("invites a worker, blocks public signup and revokes their session", async ({ page, request }) => {
    const storage = JSON.parse(fs.readFileSync(e2eEnv.adminStoragePath, "utf8")) as {
      cookies?: unknown[]
    }
    test.skip(!storage.cookies?.length, "Admin session missing")

    await page.goto("/admin/equipo", { waitUntil: "domcontentloaded" })
    await expect(page.getByRole("heading", { name: "Equipo y actividad" })).toBeVisible()
    await expect(page).toHaveTitle(/Equipo/i)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    const teamResponse = await request.get("/api/admin/workforce/")
    expect(teamResponse.ok()).toBe(true)
    const team = (await teamResponse.json()) as {
      roles: Array<{ id: string }>
      raffles: Array<{ id: number }>
    }
    const role = team.roles.find((entry) => entry.id === "analyst") ?? team.roles[0]
    expect(role).toBeDefined()
    const email = `staff-e2e-${Date.now()}@example.test`
    const invitedResponse = await request.post("/api/admin/workforce/", {
      headers: sameOrigin,
      data: { name: "Trabajador E2E", email, role: role!.id, grants: [] },
    })
    expect(invitedResponse.status()).toBe(201)
    const invited = (await invitedResponse.json()) as { id: string; invitationUrl: string }
    const token = new URL(invited.invitationUrl).hash.replace("#token=", "")
    expect(token.length).toBeGreaterThan(40)

    const worker = await playwrightRequest.newContext({ baseURL: e2eEnv.baseUrl })
    try {
      const signUp = await worker.post("/api/auth/sign-up/email", {
        data: { name: "Unknown", email: `public-${Date.now()}@example.test`, password: "a-safe-passphrase-123" },
      })
      expect(signUp.ok()).toBe(false)

      const inspect = await worker.post("/api/invitations/inspect", {
        headers: sameOrigin,
        data: { token },
      })
      expect(inspect.ok()).toBe(true)
      expect((await inspect.json()).email).toBe(email)
      await page.goto(invited.invitationUrl, { waitUntil: "networkidle" })
      await expect(page.getByRole("heading", { name: "Activa tu cuenta" })).toBeVisible()
      await expect(page.getByText("Trabajador E2E", { exact: false })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.locator("#invite-password").fill("a-safe-passphrase-123")
      await page.locator("#invite-confirm").fill("a-safe-passphrase-123")
      await page.getByRole("button", { name: "Activar acceso" }).click()
      await expect(page.getByRole("heading", { name: "Tu acceso está listo" })).toBeVisible()
      expect((await worker.post("/api/invitations/accept", {
        headers: sameOrigin,
        data: { token, password: "a-safe-passphrase-123" },
      })).status()).toBe(410)

      const signIn = await worker.post("/api/auth/sign-in/email", {
        headers: sameOrigin,
        data: { email, password: "a-safe-passphrase-123" },
      })
      expect(signIn.ok(), await signIn.text()).toBe(true)
      expect((await worker.get("/api/admin/workforce/")).status()).toBe(403)
      expect((await worker.get("/api/admin/config")).status()).toBe(403)
      if (team.raffles.length) expect((await worker.get("/api/admin/raffles/")).ok()).toBe(true)

      const disable = await request.put(`/api/admin/workforce/${invited.id}`, {
        headers: sameOrigin,
        data: { role: role!.id, status: "disabled", grants: [] },
      })
      expect(disable.ok()).toBe(true)
      expect((await worker.get("/api/admin/raffles/")).status()).toBe(401)
      expect((await worker.post("/api/auth/sign-in/email", {
        headers: sameOrigin,
        data: { email, password: "a-safe-passphrase-123" },
      })).ok()).toBe(false)
    } finally {
      await worker.dispose()
    }
  })
})
