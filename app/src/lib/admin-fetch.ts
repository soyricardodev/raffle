import { ApiClientError } from "@/lib/api-client-error"
import {
  createResponseParseClientError,
  getApiErrorMessage,
  normalizeFetchError,
  readApiClientError,
} from "@/lib/api-error-message"

async function parseJsonResponse<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    throw createResponseParseClientError(res.status)
  }
}

async function requestFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init)
  } catch (error) {
    throw normalizeFetchError(error)
  }
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await requestFetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (res.status === 401) {
    throw new ApiClientError("Sesión expirada. Inicia sesión de nuevo.", "UNAUTHORIZED", 401, undefined, false)
  }

  if (!res.ok) {
    throw await readApiClientError(res)
  }

  return parseJsonResponse<T>(res)
}

export async function adminUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await requestFetch(path, {
    method: "POST",
    body: form,
    credentials: "include",
  })

  if (res.status === 401) {
    throw new ApiClientError("Sesión expirada. Inicia sesión de nuevo.", "UNAUTHORIZED", 401, undefined, false)
  }

  if (!res.ok) {
    throw await readApiClientError(res)
  }

  return parseJsonResponse<T>(res)
}

export async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const res = await requestFetch(path, {
    ...init,
    headers: isFormData
      ? { ...init?.headers }
      : {
          "Content-Type": "application/json",
          ...init?.headers,
        },
  })

  if (!res.ok) {
    throw await readApiClientError(res)
  }

  return parseJsonResponse<T>(res)
}

export { getApiErrorMessage, ApiClientError }
