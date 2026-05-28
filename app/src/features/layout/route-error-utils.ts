import { AppError } from "@raffle/shared/errors"

export type RouteErrorPresentation = {
  title: string
  description: string
  code?: string
  statusCode?: number
  isNotFound: boolean
}

const GENERIC_DESCRIPTION =
  "No pudimos cargar esta página. Puedes intentar de nuevo o volver al inicio."

function isNotFoundMessage(message: string) {
  return /not\s*found|no encontrad|404/i.test(message)
}

export function resolveRouteError(error: unknown): RouteErrorPresentation {
  if (error instanceof AppError) {
    const isNotFound = error.statusCode === 404
    return {
      title: isNotFound ? "No encontrado" : "No se pudo completar",
      description: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isNotFound,
    }
  }

  if (error instanceof Error) {
    const isNotFound = isNotFoundMessage(error.message)
    const showMessage = import.meta.env.DEV || isNotFound

    return {
      title: isNotFound ? "No encontrado" : "Algo salió mal",
      description: showMessage ? error.message : GENERIC_DESCRIPTION,
      isNotFound,
    }
  }

  return {
    title: "Algo salió mal",
    description: GENERIC_DESCRIPTION,
    isNotFound: false,
  }
}

export function formatRouteErrorDetails(error: unknown, info?: { componentStack?: string }) {
  const lines: string[] = []

  if (error instanceof Error) {
    lines.push(`${error.name}: ${error.message}`)
    if (error.stack) lines.push(error.stack)
  } else {
    lines.push(String(error))
  }

  if (info?.componentStack) {
    lines.push("", "Component stack:", info.componentStack)
  }

  return lines.join("\n")
}
