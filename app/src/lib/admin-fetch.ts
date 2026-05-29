import { getApiErrorMessage, readApiErrorMessage } from "@/lib/api-error-message"

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (res.status === 401) {
    throw new Error("Sesión expirada. Inicia sesión de nuevo.")
  }

  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res))
  }

  return res.json() as Promise<T>
}

export async function adminUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    body: form,
    credentials: "include",
  })

  if (res.status === 401) {
    throw new Error("Sesión expirada. Inicia sesión de nuevo.")
  }

  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res))
  }

  return res.json() as Promise<T>
}

export async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const res = await fetch(path, {
    ...init,
    headers: isFormData
      ? { ...init?.headers }
      : {
          "Content-Type": "application/json",
          ...init?.headers,
        },
  })

  if (!res.ok) {
    throw new Error(await readApiErrorMessage(res))
  }

  return res.json() as Promise<T>
}

export { getApiErrorMessage }
