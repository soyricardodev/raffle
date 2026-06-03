import { describe, expect, it } from "vitest"
import { ChangePasswordFormInput, validateChangePasswordForm } from "./change-password"

describe("ChangePasswordFormInput", () => {
  it("accepts valid passwords", () => {
    const result = ChangePasswordFormInput.safeParse({
      currentPassword: "old-secret",
      newPassword: "new-secret",
      confirmPassword: "new-secret",
    })
    expect(result.success).toBe(true)
  })

  it("rejects mismatched confirmation", () => {
    const result = ChangePasswordFormInput.safeParse({
      currentPassword: "old-secret",
      newPassword: "new-secret",
      confirmPassword: "other-secret",
    })
    expect(result.success).toBe(false)
  })

  it("rejects when new password equals current", () => {
    const result = ChangePasswordFormInput.safeParse({
      currentPassword: "same-secret",
      newPassword: "same-secret",
      confirmPassword: "same-secret",
    })
    expect(result.success).toBe(false)
  })
})

describe("validateChangePasswordForm", () => {
  it("returns payload without confirmPassword", () => {
    const result = validateChangePasswordForm({
      currentPassword: "old-secret",
      newPassword: "new-secret",
      confirmPassword: "new-secret",
    })
    expect(result).toEqual({
      ok: true,
      data: { currentPassword: "old-secret", newPassword: "new-secret" },
    })
  })

  it("returns field errors for invalid input", () => {
    const result = validateChangePasswordForm({
      currentPassword: "",
      newPassword: "short",
      confirmPassword: "short",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors.currentPassword).toBeTruthy()
      expect(result.fieldErrors.newPassword).toBeTruthy()
    }
  })
})
