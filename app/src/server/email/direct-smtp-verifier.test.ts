import net, { type Server } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import {
  classifyRecipientResponse,
  isPublicMailAddress,
  probeSmtpRecipient,
  resolveMailHosts,
} from "./direct-smtp-verifier"

const servers: Server[] = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
})

async function startSmtpServer(
  recipientReply: string,
  catchAllReply = "550 5.1.1 No such user",
): Promise<{ commands: string[]; port: number }> {
  const commands: string[] = []
  const server = net.createServer((socket) => {
    socket.setEncoding("ascii")
    socket.write("220 test.example ESMTP\r\n")
    let buffer = ""

    socket.on("data", (chunk: string) => {
      buffer += chunk
      let newline = buffer.indexOf("\n")
      while (newline >= 0) {
        const command = buffer.slice(0, newline).replace(/\r$/, "")
        buffer = buffer.slice(newline + 1)
        commands.push(command)

        if (command.startsWith("EHLO")) socket.write("250-test.example\r\n250 PIPELINING\r\n")
        else if (command.startsWith("HELO")) socket.write("250 test.example\r\n")
        else if (command.startsWith("MAIL FROM")) socket.write("250 2.1.0 Sender accepted\r\n")
        else if (command === "RSET") socket.write("250 2.0.0 Reset\r\n")
        else if (command.startsWith("RCPT TO:<client@")) socket.write(`${recipientReply}\r\n`)
        else if (command.startsWith("RCPT TO:<yoiber-check-")) socket.write(`${catchAllReply}\r\n`)
        else if (command === "QUIT") {
          socket.write("221 2.0.0 Bye\r\n")
          socket.end()
        }

        newline = buffer.indexOf("\n")
      }
    })
  })
  servers.push(server)

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Fake SMTP server has no TCP port")
  return { commands, port: address.port }
}

describe("classifyRecipientResponse", () => {
  it("suppresses only definitive mailbox failures", () => {
    expect(
      classifyRecipientResponse({
        code: 550,
        enhancedStatus: "5.1.1",
        message: "550 5.1.1 No such user",
      }),
    ).toEqual({ state: "undeliverable", reason: "mailbox_not_found" })
  })

  it("does not mistake a spam-policy rejection for a missing mailbox", () => {
    expect(
      classifyRecipientResponse({
        code: 550,
        enhancedStatus: "5.7.1",
        message: "550 5.7.1 Message classified as spam",
      }),
    ).toEqual({ state: "unknown", reason: "policy_rejection" })
  })

  it("holds a disabled mailbox for revalidation instead of suppressing it permanently", () => {
    expect(
      classifyRecipientResponse({
        code: 550,
        enhancedStatus: "5.2.1",
        message: "550 5.2.1 The email account is disabled",
      }),
    ).toEqual({ state: "risky", reason: "mailbox_disabled" })
  })
})

describe("resolveMailHosts", () => {
  it("treats the reserved invalid TLD as having no mail server", async () => {
    await expect(resolveMailHosts("missing.invalid")).resolves.toEqual([])
  })
})

describe("isPublicMailAddress", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.4",
    "192.168.1.2",
    "::1",
    "fd00::1",
  ])("blocks private SMTP target %s", (address) => expect(isPublicMailAddress(address)).toBe(false))

  it.each(["8.8.8.8", "2607:f8b0:400e:c00::1a"])("allows public SMTP target %s", (address) =>
    expect(isPublicMailAddress(address)).toBe(true))
})

describe("probeSmtpRecipient", () => {
  it("accepts a real recipient after the MX rejects a random catch-all address", async () => {
    const fake = await startSmtpServer("250 2.1.5 Recipient accepted")

    const result = await probeSmtpRecipient({
      catchAllEmail: "yoiber-check-random@example.com",
      helloName: "yoiberifas.com",
      host: "127.0.0.1",
      port: fake.port,
      recipient: "client@example.com",
      sender: "noreply@yoiberifas.com",
      timeoutMs: 2_000,
    })

    expect(result).toEqual({
      state: "deliverable",
      reason: "recipient_accepted",
    })
    expect(fake.commands.some((command) => command.startsWith("DATA"))).toBe(false)
  })

  it("holds a recipient when the MX rejects it for policy", async () => {
    const fake = await startSmtpServer("550 5.7.1 Message classified as spam")

    await expect(
      probeSmtpRecipient({
        catchAllEmail: "yoiber-check-random@example.com",
        helloName: "yoiberifas.com",
        host: "127.0.0.1",
        port: fake.port,
        recipient: "client@example.com",
        sender: "noreply@yoiberifas.com",
        timeoutMs: 2_000,
      }),
    ).resolves.toEqual({ state: "unknown", reason: "policy_rejection" })
  })
})
