import { readFileSync } from "node:fs"
import { EmailSendError } from "@raffle/shared/errors"
import nodemailer, { type DKIMOptions, type Transporter } from "nodemailer"
import { getEnv, type ServerEnv } from "@/lib/env"
import { getLogger } from "@/lib/logger"
import { formatEmailFrom, resolveEmailSenderConfig } from "./email-from"
import type { EmailAdapter, SendEmailParams, SendEmailResult } from "./types"

const logger = getLogger()

/**
 * .env files cannot hold real newlines, so a pasted PEM arrives with literal "\n".
 * SMTP_DKIM_PRIVATE_KEY_PATH avoids the escaping problem entirely.
 */
function readDkimPrivateKey(env: ServerEnv): string {
  const keyPath = env.SMTP_DKIM_PRIVATE_KEY_PATH?.trim()
  if (keyPath) {
    try {
      return readFileSync(keyPath, "utf8")
    } catch (error) {
      throw new Error(`No se pudo leer SMTP_DKIM_PRIVATE_KEY_PATH (${keyPath}): ${String(error)}`)
    }
  }

  const inline = env.SMTP_DKIM_PRIVATE_KEY?.trim()
  if (!inline) {
    throw new Error(
      "DKIM está configurado pero falta SMTP_DKIM_PRIVATE_KEY o SMTP_DKIM_PRIVATE_KEY_PATH",
    )
  }
  return inline.includes("\\n") ? inline.replace(/\\n/g, "\n") : inline
}

function resolveDkimOptions(env: ServerEnv): DKIMOptions | undefined {
  const domainName = env.SMTP_DKIM_DOMAIN?.trim()
  const keySelector = env.SMTP_DKIM_SELECTOR?.trim()
  const hasKey = Boolean(env.SMTP_DKIM_PRIVATE_KEY?.trim() || env.SMTP_DKIM_PRIVATE_KEY_PATH?.trim())

  if (!domainName && !keySelector && !hasKey) return undefined

  if (!domainName || !keySelector) {
    throw new Error(
      "SMTP_DKIM_DOMAIN y SMTP_DKIM_SELECTOR son obligatorios cuando DKIM está configurado",
    )
  }

  return { domainName, keySelector, privateKey: readDkimPrivateKey(env) }
}

export class SmtpEmailAdapter implements EmailAdapter {
  readonly provider = "smtp"
  private transporter: Transporter | undefined

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter

    const env = getEnv()
    const host = env.SMTP_HOST?.trim()
    const user = env.SMTP_USER?.trim()
    const pass = env.SMTP_PASS

    if (!host || !user || !pass) {
      throw new Error("SMTP_HOST, SMTP_USER y SMTP_PASS son obligatorios con EMAIL_PROVIDER=smtp")
    }

    const dkim = resolveDkimOptions(env)

    this.transporter = nodemailer.createTransport({
      host,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: { user, pass },
      pool: true,
      maxConnections: env.SMTP_MAX_CONNECTIONS,
      maxMessages: env.SMTP_MAX_MESSAGES,
      rateDelta: 1000,
      rateLimit: env.SMTP_RATE_LIMIT,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      ...(dkim ? { dkim } : {}),
    })

    logger.info(
      {
        host,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        dkimDomain: dkim?.domainName ?? null,
      },
      "email:smtp:transport_ready",
    )

    return this.transporter
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const sender = await resolveEmailSenderConfig()

    try {
      const info = await this.getTransporter().sendMail({
        from: formatEmailFrom(sender.fromName, sender.fromEmail),
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(sender.replyTo ? { replyTo: sender.replyTo } : {}),
      })

      const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : []
      if (rejected.length > 0) {
        throw new EmailSendError(
          params.to,
          `El relay rechazó el destinatario: ${rejected.join(", ")}`,
        )
      }

      logger.info(
        { subject: params.subject, messageId: info.messageId },
        "email:smtp:sent",
      )

      return {
        success: true,
        providerMessageId: info.messageId,
      }
    } catch (error) {
      if (error instanceof EmailSendError) throw error
      throw new EmailSendError(params.to, String(error))
    }
  }
}
