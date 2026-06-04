import { ValidationError } from "@raffle/shared/errors"

export function parsePositiveRouteId(raw: string, label = "ID"): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError(`${label} inválido`)
  }
  return id
}
