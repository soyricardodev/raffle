/** Shared client/server rules for purchase payment proof files. */

export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024
export const PAYMENT_PROOF_MAX_MB = PAYMENT_PROOF_MAX_BYTES / (1024 * 1024)

/** Broad picker filter — real validation happens after selection. */
export const PAYMENT_PROOF_ACCEPT_ATTR =
  "image/*,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf,.heic,.heif"

const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
}

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".heic": "image/heic",
  ".heif": "image/heif",
}

export const PAYMENT_PROOF_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
])

export const PAYMENT_PROOF_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
}

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".")
  if (i < 0) return ""
  return name.slice(i).toLowerCase()
}

export function resolvePaymentProofMime(file: { type: string; name: string }): string {
  const raw = file.type.trim().toLowerCase()
  if (raw && MIME_ALIASES[raw]) return MIME_ALIASES[raw]!
  if (raw && raw !== "application/octet-stream") return raw
  return EXT_TO_MIME[extensionOf(file.name)] ?? raw
}

export function isHeicPaymentProof(file: { type: string; name: string }): boolean {
  const mime = resolvePaymentProofMime(file)
  if (mime === "image/heic" || mime === "image/heif") return true
  const ext = extensionOf(file.name)
  return ext === ".heic" || ext === ".heif"
}

export type PaymentProofValidation =
  | { ok: true; file: File; mime: string }
  | { ok: false; error: string }

/** Normalize + validate a proof file before keeping it in form state. */
export function validatePaymentProofFile(file: File): PaymentProofValidation {
  if (file.size <= 0) {
    return {
      ok: false,
      error: "No se pudo leer el archivo. Prueba otra vez o elige una foto de la galería.",
    }
  }

  if (file.size > PAYMENT_PROOF_MAX_BYTES) {
    return { ok: false, error: `El archivo supera ${PAYMENT_PROOF_MAX_MB} MB. Elige una foto más liviana.` }
  }

  if (isHeicPaymentProof(file)) {
    return {
      ok: false,
      error:
        "Formato HEIC no compatible. En iPhone: Ajustes → Cámara → Formatos → «Más compatible», o usa «Tomar foto» aquí.",
    }
  }

  const mime = resolvePaymentProofMime(file)
  if (!PAYMENT_PROOF_ALLOWED_MIME.has(mime)) {
    return {
      ok: false,
      error: "Formato no válido. Usa JPG, PNG, WEBP, GIF o PDF.",
    }
  }

  const safeName =
    file.name.trim() || `comprobante${PAYMENT_PROOF_EXT_BY_MIME[mime] ?? ".jpg"}`
  const normalized =
    mime !== file.type || safeName !== file.name
      ? new File([file], safeName, { type: mime, lastModified: file.lastModified })
      : file

  return { ok: true, file: normalized, mime }
}
