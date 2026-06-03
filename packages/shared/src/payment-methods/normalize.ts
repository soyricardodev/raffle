import type { PaymentMethod } from "./types.js"
import { looksLikeZelleEmail } from "./zelle-contact.js"

/** Map legacy / Spanish keys to canonical English keys per method type. */
const KEY_ALIASES: Record<string, string> = {
  banco: "bank",
  telefono: "phone",
  account: "email",
  holder: "holder_name",
  titular: "holder_name",
}

/** Split combined cedula like V-12345678 into type + number when possible. */
function splitCedula(raw: Record<string, string>): Record<string, string> {
  const out = { ...raw }
  const combined = out.cedula

  if (combined && !(out.cedula_type && out.cedula_number)) {
    const trimmed = combined.trim()
    const withSeparator = /^([VJE])\s*[-.]?\s*(\d+)$/i.exec(trimmed)
    if (withSeparator) {
      out.cedula_type = withSeparator[1]!.toUpperCase()
      out.cedula_number = withSeparator[2]!
      delete out.cedula
    } else if (/^\d+$/.test(trimmed)) {
      out.cedula_type = "V"
      out.cedula_number = trimmed
      delete out.cedula
    } else {
      const compact = /^([VJE])(\d+)$/i.exec(trimmed)
      if (compact) {
        out.cedula_type = compact[1]!.toUpperCase()
        out.cedula_number = compact[2]!
        delete out.cedula
      }
    }
  }

  if (out.cedula_number && !out.cedula_type) {
    out.cedula_type = "V"
  }

  return out
}

export function normalizeAccountInfoKeys(
  methodType: PaymentMethod,
  info: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(info)) {
    if (value === undefined || value === null) continue
    const trimmed = String(value).trim()
    if (!trimmed) continue
    const canonical = KEY_ALIASES[key] ?? key
    out[canonical] = trimmed
  }

  if (methodType === "pago_movil") {
    return splitCedula(out)
  }

  if (methodType === "zelle") {
    const rawContact = out.contact ?? out.email ?? out.phone ?? out.account
    if (rawContact) {
      if (looksLikeZelleEmail(rawContact)) {
        out.email = rawContact.trim()
        delete out.phone
      } else {
        out.phone = rawContact.replace(/\D/g, "")
        delete out.email
      }
      delete out.account
      delete out.contact
    }
    return out
  }

  // Legacy zinli/binance used `account` for email
  if ((methodType === "zinli" || methodType === "binance") && out.account && !out.email) {
    out.email = out.account
    delete out.account
  }

  if (methodType === "bs" || methodType === "usd") {
    if (out.holder_name && !out.holder) {
      out.holder = out.holder_name
      delete out.holder_name
    }
  }

  return out
}

export function stableAccountInfoKey(
  methodType: PaymentMethod,
  info: Record<string, string>,
): string {
  const normalized = normalizeAccountInfoKeys(methodType, info)
  const sorted = Object.keys(normalized)
    .sort()
    .reduce<Record<string, string>>((acc, k) => {
      acc[k] = normalized[k]!
      return acc
    }, {})
  return JSON.stringify({ methodType, account: sorted })
}
