import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { getEnv } from "./env"
import { getLogger } from "./logger"

const logger = getLogger()

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

const ALLOWED_MIME = new Set([...IMAGE_MIME, "application/pdf"])
const MAX_BYTES = 5 * 1024 * 1024

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
}

function extensionForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? ".bin"
}

export async function savePaymentProof(file: File): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Tipo de archivo no permitido. Usa JPG, PNG, WEBP, GIF o PDF.")
  }
  if (file.size > MAX_BYTES) {
    throw new Error("El comprobante no puede superar 5 MB.")
  }

  const env = getEnv()
  const paymentsDir = path.join(env.UPLOAD_DIR, "payments")
  await mkdir(paymentsDir, { recursive: true })

  const ext = extensionForMime(file.type)
  const filename = `${randomUUID()}${ext}`
  const fullPath = path.join(paymentsDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  logger.info({ filename, size: file.size, mime: file.type }, "upload:payment_proof_saved")

  return `/uploads/payments/${filename}`
}

export type AdminImageKind = "raffles" | "prizes" | "site"

export async function saveAdminImage(file: File, kind: AdminImageKind): Promise<string> {
  if (!IMAGE_MIME.has(file.type)) {
    throw new Error("Tipo de imagen no permitido. Usa JPG, PNG, WEBP o GIF.")
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen no puede superar 5 MB.")
  }

  const env = getEnv()
  const targetDir = path.join(env.UPLOAD_DIR, kind)
  await mkdir(targetDir, { recursive: true })

  const ext = extensionForMime(file.type)
  const filename = `${randomUUID()}${ext}`
  const fullPath = path.join(targetDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  logger.info({ filename, kind, size: file.size, mime: file.type }, "upload:admin_image_saved")

  return `/uploads/${kind}/${filename}`
}
