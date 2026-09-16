/**
 * Corrección silenciosa de dominios de correo mal escritos.
 *
 * Los 178 dominios reales de producción (174.787 correos) muestran que el
 * problema son siempre los mismos dedazos: gmail.con (389), gamil.com (200),
 * gmil.com (154), gimail.com (120), gmai.com (102), 123gmail.com (18)… Cada uno
 * es un cliente que pagó y nunca recibió sus boletos porque el correo rebotó.
 *
 * PRINCIPIO RECTOR: un rebote se recupera — el cliente escribe y se le
 * reenvía. Un correo entregado a la persona equivocada no se recupera: expone
 * los boletos de alguien más. Ante la duda, NO se corrige.
 *
 * De ahí salen cuatro decisiones que vienen de los datos, no de la intuición:
 *
 * 1. `mail.com` (134 clientes reales), `email.com` y `aol.com` son IMANES: casi
 *    cualquier dedazo de "gmail"/"hotmail" queda a un carácter de ellos
 *    (`mgil` → `mail`, `gmaol` → `aol`). Por eso solo se corrigen cuando la
 *    etiqueta es EXACTA y lo único roto es el TLD (`mail.con` → `mail.com`).
 * 2. `cloud.com` es real y está a una edición de `icloud.com`: protegido.
 * 3. Si dos proveedores quedan a la misma distancia, no se elige. `hmail.com`
 *    está a una edición de `gmail.com` y de `ymail.com`.
 * 4. Nunca se adivinan las dos partes a la vez. Con el TLD roto solo se corrige
 *    la etiqueta si es un proveedor exacto; al revés, con la etiqueta dudosa
 *    solo se acepta un TLD válido.
 */

type Provider = {
  label: string
  tld: string
  /**
   * Los gigantes toleran dedazos en su nombre. Los imanes (mail, email, aol)
   * no: son el destino equivocado más probable.
   */
  fuzzy: boolean
}

const PROVIDERS: readonly Provider[] = [
  { label: "gmail", tld: "com", fuzzy: true },
  { label: "googlemail", tld: "com", fuzzy: true },
  { label: "hotmail", tld: "com", fuzzy: true },
  { label: "outlook", tld: "com", fuzzy: true },
  { label: "yahoo", tld: "com", fuzzy: true },
  { label: "ymail", tld: "com", fuzzy: true },
  { label: "rocketmail", tld: "com", fuzzy: true },
  { label: "icloud", tld: "com", fuzzy: true },
  { label: "live", tld: "com", fuzzy: true },
  { label: "msn", tld: "com", fuzzy: true },
  { label: "proton", tld: "me", fuzzy: true },
  { label: "protonmail", tld: "com", fuzzy: true },
  { label: "gmx", tld: "com", fuzzy: true },
  { label: "zoho", tld: "com", fuzzy: true },
  { label: "yandex", tld: "com", fuzzy: true },
  // Imanes: se reconocen y se protegen, pero nunca se corrigen por parecido.
  { label: "mail", tld: "com", fuzzy: false },
  { label: "email", tld: "com", fuzzy: false },
  { label: "aol", tld: "com", fuzzy: false },
]

/** Variantes reales que se dejan intactas aunque se parezcan entre sí. */
const PROTECTED_DOMAINS: readonly string[] = [
  "hotmail.es",
  "hotmail.co.uk",
  "hotmail.fr",
  "hotmail.it",
  "hotmail.de",
  "outlook.es",
  "yahoo.es",
  "yahoo.co.uk",
  "yahoo.com.mx",
  "gmx.es",
  "gmx.net",
  "zoho.es",
  "me.com",
  "mac.com",
  // Reales observados en producción, a una edición de un gigante.
  "cloud.com",
]

const KNOWN_DOMAINS: readonly string[] = [
  ...PROVIDERS.map((provider) => `${provider.label}.${provider.tld}`),
  ...PROTECTED_DOMAINS,
]
const KNOWN_SET: ReadonlySet<string> = new Set(KNOWN_DOMAINS)
const PROTECTED_SET: ReadonlySet<string> = new Set(PROTECTED_DOMAINS)

/** Errores que la gente comete al escribir el TLD `com`. */
const MANGLED_COM = new Set(["con", "cmo", "comm", "coml", "como", "comp", "co", "vom", "comd", "gom", "gmo"])

/** Un nombre de proveedor más corto que esto compite de forma artificial. */
const FUZZY_MIN_LABEL = 5

function normalizeShape(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.+$/, "")
}

function isMangledCom(tld: string): boolean {
  return MANGLED_COM.has(tld)
}

/**
 * Distancia de edición con transposición de caracteres adyacentes
 * (Damerau-Levenshtein restringida): así `gamil.com` cuenta como un solo error
 * y no como dos.
 */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0))

  const firstRow = matrix[0]
  if (!firstRow) return 0
  for (let j = 0; j < cols; j += 1) firstRow[j] = j

  for (let i = 1; i < rows; i += 1) {
    const row = matrix[i]
    const previous = matrix[i - 1]
    if (!row || !previous) continue
    row[0] = i

    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let value = Math.min(
        (previous[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )

      const twoBack = matrix[i - 2]
      if (twoBack && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, (twoBack[j - 2] ?? 0) + 1)
      }

      row[j] = value
    }
  }

  return matrix[a.length]?.[b.length] ?? 0
}

/**
 * Distancia de "bolsa": cuántas letras sobran y cuántas faltan, sin importar el
 * orden. Distingue un olvido de letras (`mgil` → `gmail`) de un dominio distinto
 * que queda cerca por casualidad (`notgmail` → `hotmail`). A dos ediciones solo
 * se acepta una letra de diferencia por lado.
 */
function bagDistance(label: string, target: string): number {
  const pool = new Map<string, number>()
  for (const char of target) pool.set(char, (pool.get(char) ?? 0) + 1)

  let surplus = 0
  for (const char of label) {
    const left = pool.get(char) ?? 0
    if (left === 0) surplus += 1
    else pool.set(char, left - 1)
  }

  let missing = 0
  for (const left of pool.values()) missing += left

  return Math.max(surplus, missing)
}

/**
 * Etiqueta intacta y TLD roto: `gmail.con`, `mail.con`, `hotmail.cmo`.
 * Es seguro porque `.con` no existe como TLD: la dirección escrita no puede
 * funcionar de ninguna forma, así que corregirla no puede empeorar nada.
 */
function byExactLabel(label: string, tld: string): string | null {
  const matches = PROVIDERS.filter((provider) => provider.label === label && provider.tld !== tld)
  if (matches.length !== 1) return null

  const provider = matches[0]
  if (!provider) return null
  if (provider.tld === "com" && isMangledCom(tld)) return `${provider.label}.${provider.tld}`

  return null
}

/**
 * Dominio que arranca o termina pegado a un gigante: `123gmail.com`,
 * `igmail.com`, `gmail.com.ve`, `gmail.com11359928`, `gmail.con.ve`.
 * El prefijo alfabético se limita a 2 letras para no arrastrar dominios reales
 * tipo `notgmail.com`.
 */
function byGluedJunk(domain: string): string | null {
  const parts = domain.split(".")

  // gmail.con.ve / gmail.com.ve → etiqueta + TLD roto + más etiquetas
  if (parts.length >= 3) {
    const first = parts[0]
    const second = parts[1]
    const provider = PROVIDERS.find((candidate) => candidate.fuzzy && candidate.label === first)
    if (provider && second && (second === provider.tld || isMangledCom(second))) {
      return `${provider.label}.${provider.tld}`
    }
  }

  for (const provider of PROVIDERS) {
    if (!provider.fuzzy || provider.label.length < FUZZY_MIN_LABEL) continue
    const glued = `${provider.label}.${provider.tld}`
    if (domain === glued) continue

    if (domain.startsWith(glued)) {
      const tail = domain.slice(glued.length)
      if (tail.length > 0 && tail.length <= 12 && /^[0-9a-z.]*$/.test(tail)) return glued
    }

    if (domain.endsWith(glued)) {
      const head = domain.slice(0, domain.length - glued.length)
      if (head.length > 0 && head.length <= 8 && /^[0-9]+$/.test(head)) return glued
      if (head.length > 0 && head.length <= 2 && /^[a-z]+$/.test(head)) return glued
    }
  }

  return null
}

/**
 * Dedazo en el nombre del proveedor: `gamil.com`, `gmil.com`, `gmai.com`.
 * Exige ganador único: si dos gigantes quedan a la misma distancia, no se elige
 * y el correo queda intacto.
 */
function byFuzzyLabel(label: string, tld: string): string | null {
  if (label.length < 4) return null

  let best: Provider | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  let ties = 0

  for (const provider of PROVIDERS) {
    if (!provider.fuzzy || provider.label.length < FUZZY_MIN_LABEL) continue
    if (tld !== provider.tld) continue

    const distance = editDistance(label, provider.label)
    if (distance > 2) continue
    if (Math.abs(label.length - provider.label.length) > 2) continue
    if (distance === 2 && bagDistance(label, provider.label) > 1) continue

    if (distance < bestDistance) {
      best = provider
      bestDistance = distance
      ties = 1
      continue
    }

    if (distance === bestDistance) ties += 1
  }

  if (!best || bestDistance > 2 || ties !== 1) return null

  return `${best.label}.${best.tld}`
}

function resolveDomain(domain: string): string {
  if (KNOWN_SET.has(domain) || PROTECTED_SET.has(domain)) return domain

  const lastDot = domain.lastIndexOf(".")
  if (lastDot <= 0 || lastDot === domain.length - 1) return domain

  const label = domain.slice(0, lastDot)
  const tld = domain.slice(lastDot + 1)

  // Una etiqueta con punto es un subdominio o una cadena rara: no se adivina.
  if (label.includes(".")) return byGluedJunk(domain) ?? domain

  return byExactLabel(label, tld) ?? byGluedJunk(domain) ?? byFuzzyLabel(label, tld) ?? domain
}

export type EmailDomainFix = "domain" | null

export type EmailDomainResult = {
  /** Correo listo para guardar y enviar. */
  email: string
  /** Dominio final, ya normalizado. */
  domain: string
  /** "domain" solo cuando se reemplazó el dominio por un dedazo. */
  fix: EmailDomainFix
}

/**
 * Devuelve el correo normalizado. Nunca lanza y nunca inventa: si no hay una
 * corrección clara, devuelve el valor original sin espacios.
 */
export function correctEmailDomain(input: string): EmailDomainResult {
  const compact = String(input ?? "").replace(/\s+/g, "")
  const at = compact.lastIndexOf("@")

  if (at <= 0 || at === compact.length - 1) {
    return { email: compact, domain: "", fix: null }
  }

  const local = compact.slice(0, at)
  const typedDomain = compact.slice(at + 1)
  const normalized = normalizeShape(typedDomain)
  const resolved = resolveDomain(normalized)

  return {
    email: `${local}@${resolved}`,
    domain: resolved,
    fix: resolved === normalized ? null : "domain",
  }
}

/** Azúcar para los sitios donde solo importa el correo. */
export function normalizeEmail(input: string): string {
  return correctEmailDomain(input).email
}

export const KNOWN_EMAIL_DOMAINS = KNOWN_DOMAINS
