import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { FileTooLargeError, InvalidFileTypeError } from "@raffle/shared/errors"
import { getEnv } from "./env"
import { getLogger } from "./logger"
import {
  PAYMENT_PROOF_ALLOWED_MIME,
  PAYMENT_PROOF_EXT_BY_MIME,
  PAYMENT_PROOF_MAX_BYTES,
  isHeicPaymentProof,
  resolvePaymentProofMime,
} from "./payment-proof"

const logger = getLogger()

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

const ADMIN_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
}

function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg"
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png"
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp"
  }
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 6) === "GIF87a") return "image/gif"
  if (buffer.length >= 6 && buffer.toString("ascii", 0, 6) === "GIF89a") return "image/gif"
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf"
  return null
}

export async function savePaymentProof(file: File): Promise<string> {
  if (file.size <= 0) {
    throw new InvalidFileTypeError("empty", [...PAYMENT_PROOF_ALLOWED_MIME])
  }
  if (file.size > PAYMENT_PROOF_MAX_BYTES) {
    throw new FileTooLargeError(PAYMENT_PROOF_MAX_BYTES)
  }
  if (isHeicPaymentProof(file)) {
    throw new InvalidFileTypeError("image/heic", [...PAYMENT_PROOF_ALLOWED_MIME])
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let mime = resolvePaymentProofMime(file)
  if (!PAYMENT_PROOF_ALLOWED_MIME.has(mime)) {
    mime = sniffImageMime(buffer) ?? mime
  }
  if (!PAYMENT_PROOF_ALLOWED_MIME.has(mime)) {
    throw new InvalidFileTypeError(mime || file.type || "unknown", [...PAYMENT_PROOF_ALLOWED_MIME])
  }

  const env = getEnv()
  const paymentsDir = path.join(env.UPLOAD_DIR, "payments")
  await mkdir(paymentsDir, { recursive: true })

  const ext = PAYMENT_PROOF_EXT_BY_MIME[mime] ?? ".bin"
  const filename = `${randomUUID()}${ext}`
  const fullPath = path.join(paymentsDir, filename)
  await writeFile(fullPath, buffer)

  logger.info({ filename, size: file.size, mime }, "upload:payment_proof_saved")

  return `/uploads/payments/${filename}`
}

export type AdminImageKind = "raffles" | "prizes" | "site"

export async function saveAdminImage(file: File, kind: AdminImageKind): Promise<string> {
  if (!IMAGE_MIME.has(file.type)) {
    throw new Error("Tipo de imagen no permitido. Usa JPG, PNG, WEBP o GIF.")
  }
  if (file.size > PAYMENT_PROOF_MAX_BYTES) {
    throw new Error("La imagen no puede superar 5 MB.")
  }

  const env = getEnv()
  const targetDir = path.join(env.UPLOAD_DIR, kind)
  await mkdir(targetDir, { recursive: true })

  const ext = ADMIN_EXT_BY_MIME[file.type] ?? ".bin"
  const filename = `${randomUUID()}${ext}`
  const fullPath = path.join(targetDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  logger.info({ filename, kind, size: file.size, mime: file.type }, "upload:admin_image_saved")

  return `/uploads/${kind}/${filename}`
}
