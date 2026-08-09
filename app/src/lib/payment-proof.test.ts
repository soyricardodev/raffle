import { describe, expect, it } from "vitest"
import {
  isHeicPaymentProof,
  resolvePaymentProofMime,
  validatePaymentProofFile,
} from "./payment-proof"

function fakeFile(name: string, type: string, size = 128): File {
  const bytes = new Uint8Array(size)
  return new File([bytes], name, { type })
}

describe("resolvePaymentProofMime", () => {
  it("maps image/jpg alias to image/jpeg", () => {
    expect(resolvePaymentProofMime({ type: "image/jpg", name: "x.jpg" })).toBe("image/jpeg")
  })

  it("infers mime from extension when type is empty", () => {
    expect(resolvePaymentProofMime({ type: "", name: "foto.PNG" })).toBe("image/png")
  })

  it("infers jpeg from common camera filename", () => {
    expect(resolvePaymentProofMime({ type: "", name: "image.jpg" })).toBe("image/jpeg")
  })
})

describe("validatePaymentProofFile", () => {
  it("accepts jpeg with alias mime and normalizes type", () => {
    const result = validatePaymentProofFile(fakeFile("pago.jpg", "image/jpg"))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.file.type).toBe("image/jpeg")
      expect(result.mime).toBe("image/jpeg")
    }
  })

  it("accepts file with empty mime when extension is png", () => {
    const result = validatePaymentProofFile(fakeFile("comprobante.png", ""))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.file.type).toBe("image/png")
  })

  it("rejects empty files with actionable message", () => {
    const result = validatePaymentProofFile(fakeFile("empty.jpg", "image/jpeg", 0))
    expect(result).toEqual({
      ok: false,
      error: "No se pudo leer el archivo. Prueba otra vez o elige una foto de la galería.",
    })
  })

  it("rejects HEIC with iPhone guidance", () => {
    const result = validatePaymentProofFile(fakeFile("IMG_1234.HEIC", "image/heic"))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/HEIC/i)
  })

  it("detects HEIC by extension when mime is empty", () => {
    expect(isHeicPaymentProof({ type: "", name: "photo.heic" })).toBe(true)
    const result = validatePaymentProofFile(fakeFile("photo.heic", ""))
    expect(result.ok).toBe(false)
  })

  it("rejects oversized files", () => {
    const result = validatePaymentProofFile(fakeFile("big.jpg", "image/jpeg", 6 * 1024 * 1024))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/MB/)
  })
})
