/* Raffle PWA — push only. No HTML cache: raffle stock must stay live. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return
  event.respondWith(fetch(event.request))
})

self.addEventListener("push", (event) => {
  let data = {
    title: "Yoiber Rifas",
    body: "Tienes un aviso nuevo",
    url: "/",
    tag: "raffle",
    icon: "/pwa/icon-192.png",
  }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    if (event.data) data.body = event.data.text()
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || "Yoiber Rifas", {
        body: data.body || "",
        icon: data.icon || "/pwa/icon-192.png",
        badge: "/pwa/icon-192.png",
        data: { url: data.url || "/" },
        tag: data.tag || "raffle",
        renotify: true,
        lang: "es",
      })
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of clients) {
        client.postMessage({ type: "pwa:push-received" })
      }
    })(),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus()
          if ("navigate" in client && url) client.navigate(url)
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const oldEndpoint = event.oldSubscription?.endpoint
      if (oldEndpoint) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: oldEndpoint }),
        }).catch(() => {})
      }

      const next = event.newSubscription
      const json = next?.toJSON()
      if (json?.endpoint && json.keys?.p256dh && json.keys.auth) {
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          }),
        }).catch(() => {})
      }

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of clients) {
        client.postMessage({ type: "pwa:push-changed" })
      }
    })(),
  )
})
