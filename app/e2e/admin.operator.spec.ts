import { devices, expect, request as playwrightRequest } from "@playwright/test"
import { e2eEnv } from "./helpers/env"
import { describeWithDb, test } from "./helpers/fixtures"

describeWithDb("operator purchase scope", () => {
  test("sees only purchases and ticket lookup; other modules deny direct access", async ({
    browser,
    request,
  }, testInfo) => {
    const teamResponse = await request.get("/api/admin/workforce/")
    expect(teamResponse.ok()).toBe(true)
    const team = (await teamResponse.json()) as { roles: Array<{ id: string }> }
    test.skip(!team.roles.some((role) => role.id === "operator"), "Operator seed missing")

    const email = `operator-e2e-${Date.now()}@example.test`
    const password = ["valid", "operator", "passphrase", "123"].join("-")
    const invitedResponse = await request.post("/api/admin/workforce/", {
      headers: { Origin: e2eEnv.baseUrl },
      data: { name: "Operador E2E", email, role: "operator", grants: [] },
    })
    expect(invitedResponse.status()).toBe(201)
    const invited = (await invitedResponse.json()) as { id: string; invitationUrl: string }
    const token = new URL(invited.invitationUrl).hash.replace("#token=", "")
    const anonymous = await playwrightRequest.newContext({ baseURL: e2eEnv.baseUrl })
    const operatorContext = await browser.newContext({
      ...devices["Pixel 5"],
      baseURL: e2eEnv.baseUrl,
      storageState: { cookies: [], origins: [] },
    })
    try {
      const accepted = await anonymous.post("/api/invitations/accept", {
        headers: { Origin: e2eEnv.baseUrl },
        data: { token, password },
      })
      expect(accepted.ok()).toBe(true)

      const signIn = await operatorContext.request.post("/api/auth/sign-in/email", {
        headers: { Origin: e2eEnv.baseUrl },
        data: { email, password },
      })
      expect(signIn.ok(), await signIn.text()).toBe(true)
      const current = await operatorContext.request.get("/api/auth/get-session")
      expect((await current.json())?.user?.email).toBe(email)
      const page = await operatorContext.newPage()
      await page.goto("/admin")
      await expect(page).toHaveURL(/\/admin\/compras$/)
      await page.getByRole("button", { name: "Toggle Sidebar" }).click()
      await expect(page.locator('a[href="/admin/compras"]')).toHaveCount(1)
      await expect(page.locator('a[href="/admin/boletos"]')).toHaveCount(1)
      await expect(page.locator('a[href="/admin/rifas"]')).toHaveCount(0)
      await expect(page.locator('a[href="/admin"]')).toHaveCount(0)
      await page.waitForTimeout(500) // Wait for the mobile drawer transition before visual evidence.
      await page.screenshot({ path: testInfo.outputPath("operator-mobile.png") })

      const api = operatorContext.request
      const me = await api.get("/api/admin/workforce/me")
      expect(me.ok()).toBe(true)
      expect(
        (await me.json()).permissions.every((permission: string) =>
          permission.startsWith("purchases."),
        ),
      ).toBe(true)
      expect((await api.get("/api/admin/purchases/")).status()).toBe(200)
      expect((await api.get("/api/admin/me/preferences")).status()).toBe(200)
      for (const path of [
        "/api/admin/dashboard",
        "/api/admin/raffles/",
        "/api/admin/config",
        "/api/admin/workforce/",
      ]) {
        expect((await api.get(path)).status(), path).toBe(403)
      }

      await page.goto("/admin/boletos")
      await expect(page.getByRole("heading", { name: "Buscar boleto" })).toBeVisible()
      await page.goto("/admin/rifas")
      await expect(page).toHaveURL(/\/admin\/compras$/)
      await page.goto("/admin")
      await expect(page).toHaveURL(/\/admin\/compras$/)
    } finally {
      await request.put(`/api/admin/workforce/${invited.id}`, {
        headers: { Origin: e2eEnv.baseUrl },
        data: { role: "operator", status: "disabled", grants: [] },
      })
      await operatorContext.close()
      await anonymous.dispose()
    }
  })
})
