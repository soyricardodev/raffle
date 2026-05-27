import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { getEnv } from "./env"
import { getLogger } from "./logger"

const logger = getLogger()

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"])
const MAX_BYTES = 5 * 1024 * 1024

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

  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg")
  const filename = `${randomUUID()}${ext}`
  const fullPath = path.join(paymentsDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(fullPath, buffer)

  logger.info({ filename, size: file.size }, "upload:payment_proof_saved")

  return `/uploads/payments/${filename}`
}
