#!/usr/bin/env node
import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { spawn } from "node:child_process"

const host = "127.0.0.1"
const port = Number(process.env.PORT ?? 8081)
const binary = process.env.REACHER_BINARY ?? "/home/admin/reacher/bin/check_if_email_exists"
const secret = readFileSync(process.env.REACHER_SECRET_FILE ?? "/home/admin/reacher/reacher.secret", "utf8").trim()
const fromEmail = process.env.REACHER_FROM_EMAIL ?? "noreply@yoiberifas.com"
const helloName = process.env.REACHER_HELLO_NAME ?? "yoiberifas.com"
const timeoutMs = Number(process.env.REACHER_TIMEOUT_MS ?? 60000)
const maxBodyBytes = 16 * 1024
const maxConcurrent = 2
let active = 0
const queue = []

function json(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(payload) })
  res.end(payload)
}

function isEmail(value) {
  return typeof value === "string" && value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function runCheck(email) {
  return new Promise((resolve) => {
    const child = spawn(binary, ["--from-email", fromEmail, "--hello-name", helloName, email], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
    })
    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve({ status: 504, body: { error: "verification_timeout" } })
    }, timeoutMs)
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk) => { stdout += chunk })
    child.stderr.on("data", (chunk) => { stderr += chunk })
    child.once("error", (error) => {
      clearTimeout(timer)
      resolve({ status: 502, body: { error: "verifier_unavailable", detail: error.message } })
    })
    child.once("close", (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        resolve({ status: 502, body: { error: "verifier_failed", detail: stderr.slice(-1000) } })
        return
      }
      try {
        resolve({ status: 200, body: JSON.parse(stdout) })
      } catch {
        resolve({ status: 502, body: { error: "invalid_verifier_response" } })
      }
    })
  })
}

function schedule(email) {
  return new Promise((resolve) => queue.push({ email, resolve }))
}
async function drain() {
  while (active < maxConcurrent && queue.length > 0) {
    const item = queue.shift()
    if (!item) return
    active += 1
    runCheck(item.email).then(item.resolve).finally(() => {
      active -= 1
      void drain()
    })
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    json(res, 200, { ok: true, active, queued: queue.length })
    return
  }
  if (req.method !== "POST" || !["/v0/check_email", "/v1/check_email"].includes(req.url)) {
    json(res, 404, { error: "not_found" })
    return
  }
  if (req.headers["x-reacher-secret"] !== secret) {
    json(res, 401, { error: "unauthorized" })
    return
  }

  let body = ""
  req.setEncoding("utf8")
  req.on("data", (chunk) => {
    body += chunk
    if (Buffer.byteLength(body) > maxBodyBytes) req.destroy()
  })
  req.once("error", () => json(res, 400, { error: "invalid_request" }))
  req.once("end", async () => {
    try {
      const input = JSON.parse(body)
      const email = input?.to_email
      if (!isEmail(email)) {
        json(res, 422, { error: "invalid_to_email" })
        return
      }
      const resultPromise = schedule(email)
      void drain()
      const result = await resultPromise
      json(res, result.status, result.body)
    } catch {
      json(res, 400, { error: "invalid_json" })
    }
  })
})

server.listen(port, host, () => console.log(`reacher wrapper listening on ${host}:${port}`))
