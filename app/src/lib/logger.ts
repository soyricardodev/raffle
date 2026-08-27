import pino from "pino"
import { getEnv } from "./env"

let logger: pino.Logger | undefined

export function getLogger(): pino.Logger {
  if (!logger) {
    const { LOG_LEVEL, NODE_ENV } = getEnv()
    logger = pino({
      level: LOG_LEVEL,
      transport:
        NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
      redact: {
        paths: [
          "customer_name",
          "customer_phone",
          "customer_email",
          "customer_ci",
          "payment_payer_name",
          "paymentPayerName",
          "password",
          "authorization",
          "cookie",
          "purchases_access_key_hash",
          "keyHash",
        ],
        remove: true,
      },
    })
  }
  return logger
}

export type Logger = pino.Logger
