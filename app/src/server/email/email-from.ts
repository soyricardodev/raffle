export type EmailSenderConfig = {
  fromEmail: string
  fromName?: string
  replyTo?: string
}

export function formatEmailFrom(fromName: string | undefined, fromEmail: string): string {
  const email = fromEmail.trim()
  const name = fromName?.trim()
  if (!name) return email
  return `${name} <${email}>`
}

export { resolveEmailSenderConfig } from "./email-settings.server"
