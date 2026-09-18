import { randomUUID } from "node:crypto"
import { lookup, resolveMx } from "node:dns/promises"
import net, { type Socket } from "node:net"
import type { RecipientVerificationState } from "./recipient-verifier"

type SmtpResponse = {
  code: number
  enhancedStatus: string | null
  message: string
}

export type SmtpProbeResult = {
  state: RecipientVerificationState
  reason: string
}

type ProbeOptions = {
  catchAllEmail: string
  helloName: string
  host: string
  port?: number
  recipient: string
  sender: string
  timeoutMs: number
}

const DEFINITIVE_RECIPIENT_STATUSES = new Set(["5.1.1", "5.1.3", "5.1.6", "5.1.10"])
const DEFINITIVE_RECIPIENT_TEXT =
  /(?:no such (?:user|mailbox)|user unknown|unknown user|mailbox (?:not found|does not exist)|recipient (?:does not exist|not found)|invalid recipient)/i

function isSuccess(code: number): boolean {
  return code >= 200 && code < 300
}

export function classifyRecipientResponse(response: SmtpResponse): SmtpProbeResult {
  if (isSuccess(response.code)) return { state: "deliverable", reason: "recipient_accepted" }

  if (response.enhancedStatus && DEFINITIVE_RECIPIENT_STATUSES.has(response.enhancedStatus)) {
    return { state: "undeliverable", reason: "mailbox_not_found" }
  }

  if (response.enhancedStatus === "5.2.1") {
    return { state: "risky", reason: "mailbox_disabled" }
  }

  if (response.enhancedStatus === "5.2.2" || response.enhancedStatus === "4.2.2") {
    return { state: "risky", reason: "mailbox_full" }
  }

  if (response.enhancedStatus?.startsWith("5.7.")) {
    return { state: "unknown", reason: "policy_rejection" }
  }

  if (response.code >= 400 && response.code < 500) {
    return { state: "unknown", reason: "temporary_rejection" }
  }

  if (
    response.code === 553 ||
    (response.code === 550 && DEFINITIVE_RECIPIENT_TEXT.test(response.message))
  ) {
    return { state: "undeliverable", reason: "mailbox_not_found" }
  }

  return { state: "unknown", reason: "ambiguous_rejection" }
}

function parseResponse(lines: readonly string[]): SmtpResponse {
  const first = lines[0] ?? ""
  const code = Number.parseInt(first.slice(0, 3), 10)
  const message = lines.join("\n")
  const enhancedStatus = message.match(/\b([245]\.\d{1,3}\.\d{1,3})\b/)?.[1] ?? null
  return { code, enhancedStatus, message }
}

class SmtpSession {
  private buffer = ""
  private readonly lines: string[] = []
  private readonly responses: SmtpResponse[] = []
  private pending:
    | {
        reject: (error: Error) => void
        resolve: (response: SmtpResponse) => void
      }
    | undefined
  private failure: Error | undefined

  constructor(private readonly socket: Socket) {
    socket.setEncoding("ascii")
    socket.on("data", (chunk: string) => this.onData(chunk))
    socket.on("timeout", () => this.fail(new Error("SMTP connection timed out")))
    socket.on("error", (error) => this.fail(error))
    socket.on("close", () => {
      if (!this.failure && this.pending) this.fail(new Error("SMTP connection closed unexpectedly"))
    })
  }

  readResponse(): Promise<SmtpResponse> {
    if (this.failure) return Promise.reject(this.failure)
    const queued = this.responses.shift()
    if (queued) return Promise.resolve(queued)
    if (this.pending)
      return Promise.reject(new Error("Concurrent SMTP response reads are not supported"))

    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject }
    })
  }

  async command(value: string): Promise<SmtpResponse> {
    if (!this.socket.writable) throw new Error("SMTP connection is not writable")
    this.socket.write(`${value}\r\n`)
    return this.readResponse()
  }

  close(): void {
    if (this.socket.writable) this.socket.write("QUIT\r\n")
    this.socket.end()
  }

  abort(): void {
    this.fail(new Error("SMTP verification deadline exceeded"))
  }

  private onData(chunk: string): void {
    this.buffer += chunk
    let newline = this.buffer.indexOf("\n")
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, "")
      this.buffer = this.buffer.slice(newline + 1)
      this.lines.push(line)
      this.consumeCompleteResponse()
      newline = this.buffer.indexOf("\n")
    }
  }

  private consumeCompleteResponse(): void {
    while (this.lines.length > 0) {
      const first = this.lines[0]?.match(/^(\d{3})([- ])/)
      if (!first) {
        this.lines.shift()
        continue
      }

      const code = first[1]
      let end = first[2] === " " ? 0 : -1
      if (end < 0) {
        end = this.lines.findIndex((line, index) => index > 0 && line.startsWith(`${code} `))
      }
      if (end < 0) return

      const response = parseResponse(this.lines.splice(0, end + 1))
      const pending = this.pending
      if (pending) {
        this.pending = undefined
        pending.resolve(response)
      } else {
        this.responses.push(response)
      }
    }
  }

  private fail(error: Error): void {
    if (this.failure) return
    this.failure = error
    const pending = this.pending
    this.pending = undefined
    pending?.reject(error)
    this.socket.destroy()
  }
}

async function connect(host: string, port: number, timeoutMs: number): Promise<SmtpSession> {
  const socket = net.createConnection({ host, port })
  socket.setTimeout(timeoutMs)
  const session = new SmtpSession(socket)

  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      socket.off("connect", acceptConnection)
      socket.off("error", rejectConnection)
      socket.off("timeout", rejectTimeout)
    }
    const acceptConnection = () => {
      cleanup()
      resolve()
    }
    const rejectConnection = (error: Error) => {
      cleanup()
      reject(error)
    }
    const rejectTimeout = () => rejectConnection(new Error("SMTP connection timed out"))

    socket.once("connect", acceptConnection)
    socket.once("error", rejectConnection)
    socket.once("timeout", rejectTimeout)
  })
  return session
}

export async function probeSmtpRecipient(options: ProbeOptions): Promise<SmtpProbeResult> {
  const startedAt = Date.now()
  const session = await connect(options.host, options.port ?? 25, options.timeoutMs)
  const remaining = Math.max(1, options.timeoutMs - (Date.now() - startedAt))
  const deadline = setTimeout(() => session.abort(), remaining)

  try {
    const greeting = await session.readResponse()
    if (greeting.code !== 220) return { state: "unknown", reason: "invalid_smtp_greeting" }

    let hello = await session.command(`EHLO ${options.helloName}`)
    if (!isSuccess(hello.code)) hello = await session.command(`HELO ${options.helloName}`)
    if (!isSuccess(hello.code)) return { state: "unknown", reason: "hello_rejected" }

    const sender = await session.command(`MAIL FROM:<${options.sender}>`)
    if (!isSuccess(sender.code)) return { state: "unknown", reason: "sender_rejected" }

    const recipient = classifyRecipientResponse(
      await session.command(`RCPT TO:<${options.recipient}>`),
    )
    if (recipient.state !== "deliverable") return recipient

    const reset = await session.command("RSET")
    if (!isSuccess(reset.code)) return { state: "risky", reason: "catch_all_inconclusive" }

    const catchAllSender = await session.command(`MAIL FROM:<${options.sender}>`)
    if (!isSuccess(catchAllSender.code)) {
      return { state: "risky", reason: "catch_all_inconclusive" }
    }

    const catchAll = classifyRecipientResponse(
      await session.command(`RCPT TO:<${options.catchAllEmail}>`),
    )
    if (catchAll.state === "deliverable") return { state: "risky", reason: "catch_all_domain" }
    if (catchAll.state === "undeliverable") return recipient
    return { state: "risky", reason: "catch_all_inconclusive" }
  } finally {
    clearTimeout(deadline)
    session.close()
  }
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true
  const [first = 0, second = 0] = octets
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  )
}

export function isPublicMailAddress(address: string): boolean {
  const version = net.isIP(address)
  if (version === 4) return !isPrivateIpv4(address)
  if (version !== 6) return false

  const normalized = address.toLowerCase()
  if (normalized === "::" || normalized === "::1") return false
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return false
  if (/^fe[89ab]/.test(normalized) || normalized.startsWith("ff")) return false
  if (normalized.startsWith("2001:db8:")) return false
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length)
    return net.isIP(mapped) === 4 && !isPrivateIpv4(mapped)
  }
  return true
}

async function resolvePublicAddresses(host: string): Promise<string[]> {
  const addresses = await lookup(host, { all: true })
  return addresses.map(({ address }) => address).filter(isPublicMailAddress)
}

export async function resolveMailHosts(domain: string): Promise<string[]> {
  try {
    const records = await resolveMx(domain)
    if (records.some((record) => record.exchange === "" || record.exchange === ".")) return []
    const hosts = records
      .sort((a, b) => a.priority - b.priority)
      .map((record) => record.exchange.replace(/\.$/, ""))
      .filter(Boolean)
    if (hosts.length > 0) {
      const results = await Promise.allSettled(hosts.map(resolvePublicAddresses))
      const addresses = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      )
      if (addresses.length > 0) return [...new Set(addresses)]

      const failure = results.find((result) => result.status === "rejected")
      if (failure?.status === "rejected") throw failure.reason
      return []
    }
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : ""
    if (code !== "ENODATA" && code !== "ENOTFOUND") throw error
  }

  try {
    return await resolvePublicAddresses(domain)
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : ""
    if (code === "ENODATA" || code === "ENOTFOUND") return []
    throw error
  }
}

export function createCatchAllAddress(domain: string): string {
  return `yoiber-check-${randomUUID().replaceAll("-", "")}@${domain}`
}
