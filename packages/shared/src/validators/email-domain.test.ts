import { describe, expect, it } from "vitest"
import { correctEmailDomain, normalizeEmail } from "./email-domain.js"

/**
 * Los casos salen de los dominios reales de producción (174.787 correos).
 * El número entre paréntesis es cuántas veces apareció cada dedazo.
 */
describe("correctEmailDomain — dedazos reales de producción", () => {
  it.each([
    ["gmail.con", "gmail.com"], // 389
    ["gamil.com", "gmail.com"], // 200 — transposición
    ["gmil.com", "gmail.com"], // 154
    ["gimail.com", "gmail.com"], // 120
    ["gmai.com", "gmail.com"], // 102
    ["hotmail.con", "hotmail.com"], // 6
    ["gmaim.com", "gmail.com"], // 30
    ["gamail.com", "gmail.com"], // 30
    ["gmsil.com", "gmail.com"], // 28
    ["mgil.com", "gmail.com"], // 26 — transposición + letra faltante
    ["gimai.com", "gmail.com"], // 24
    ["gmal.com", "gmail.com"], // 22
    ["gemail.com", "gmail.com"], // 19
    ["homail.com", "hotmail.com"], // 17
    ["hptmail.com", "hotmail.com"], // 16
    ["gmail.cmo", "gmail.com"], // 16 — TLD transpuesto
    ["homtail.com", "hotmail.com"], // 12
    ["gmeil.com", "gmail.com"], // 11
    ["gmail9.com", "gmail.com"], // 8
    ["gmaik.com", "gmail.com"], // 8
    ["gmael.com", "gmail.com"], // 8
    ["gmqil.com", "gmail.com"], // 7
    ["icluod.com", "icloud.com"], // 6 — transposición
    ["gmailm.com", "gmail.com"], // 6
    ["gnail.com", "gmail.com"], // 5
    ["gmaill.com", "gmail.com"], // 5
    ["hormail.com", "hotmail.com"], // 4
    ["holmail.com", "hotmail.com"], // 4
    ["gtmail.com", "gmail.com"], // 4
    ["gmia.com", "gmail.com"], // 4
    ["gmali.com", "gmail.com"], // 4
    ["hitmail.com", "hotmail.com"], // 3
    ["gmaol.com", "gmail.com"], // 3
    ["gmaail.com", "gmail.com"], // 3
  ])("corrige %s → %s", (typed, expected) => {
    expect(normalizeEmail(`cliente@${typed}`)).toBe(`cliente@${expected}`)
  })

  it.each([
    ["gmail.com.ve", "gmail.com"], // 18 — ven a un dominio gringo
    ["gmail.con.ve", "gmail.com"], // 28
    ["gmail.com.com", "gmail.com"], // 20
    ["gmail.coma", "gmail.com"], // 18
    ["gmail.comm", "gmail.com"], // 15
    ["gmail.comcom", "gmail.com"], // 13
    ["gmail.vom", "gmail.com"], // 12
    ["gmail.com11359928", "gmail.com"], // 7
    ["gmail.commail.com", "gmail.com"], // 8
    ["gmail.comgmail.com", "gmail.com"], // 4
    ["123gmail.com", "gmail.com"], // 18
    ["1988gmail.com", "gmail.com"], // 6
    ["igmail.com", "gmail.com"], // 4
    ["mail.con", "mail.com"], // 8
    ["email.con", "email.com"], // 18
    ["yahoo.comm", "yahoo.com"], // 4
    ["yahoo.com.ve", "yahoo.com"], // 4
  ])("corrige la basura pegada %s → %s", (typed, expected) => {
    expect(normalizeEmail(`cliente@${typed}`)).toBe(`cliente@${expected}`)
  })
})

describe("correctEmailDomain — se prefiere el rebote antes que adivinar", () => {
  it.each([
    // Etiqueta dudosa Y TLD roto a la vez: las dos partes se corrigen solo si la
    // etiqueta es un proveedor exacto (gmail.con). Si no, no se toca.
    ["gmil.con", "gmil.con"],
    ["gmain.gom", "gmain.gom"],
    ["vmail.con", "vmail.con"],
    // hmail está a una edición de gmail.com y a dos de hotmail.com: sin margen
    // claro, no elegimos por el cliente.
    ["hmail.com", "hmail.com"],
    // fmail está a una edición de gmail.com Y de ymail.com: empate, no se elige.
    ["fmail.com", "fmail.com"],
  ])("deja %s sin corregir", (typed, expected) => {
    expect(normalizeEmail(`cliente@${typed}`)).toBe(`cliente@${expected}`)
  })
})

describe("correctEmailDomain — dominios que jamás se tocan", () => {
  it.each([
    "gmail.com",
    "hotmail.com",
    "icloud.com",
    "outlook.com",
    "yahoo.com",
    "hotmail.es",
    "live.com",
    "proton.me",
    "alafletes.com",
    "cloud.com",
    "429.com",
    "cantv.net",
    "empresa.com.ve",
  ])("deja intacto %s", (domain) => {
    const result = correctEmailDomain(`cliente@${domain}`)
    expect(result.email).toBe(`cliente@${domain}`)
    expect(result.fix).toBeNull()
  })

  it("protege mail.com y email.com, que están a una edición de gmail.com", () => {
    expect(normalizeEmail("juan@mail.com")).toBe("juan@mail.com")
    expect(normalizeEmail("juan@email.com")).toBe("juan@email.com")
  })

  it("no adivina cuando hay empate entre varios dominios parecidos", () => {
    // vmail.con está a la misma distancia de gmail.com, mail.com y email.com
    const result = correctEmailDomain("cliente@vmail.con")
    expect(result.email).toBe("cliente@vmail.con")
    expect(result.fix).toBeNull()
  })

  it("no inventa cuando el dominio está demasiado lejos", () => {
    expect(normalizeEmail("cliente@g.com")).toBe("cliente@g.com")
    expect(normalizeEmail("cliente@notgmail.com")).toBe("cliente@notgmail.com")
    expect(normalizeEmail("cliente@mi-negocio.ve")).toBe("cliente@mi-negocio.ve")
  })
})

describe("correctEmailDomain — nunca toca la parte local", () => {
  it("conserva puntos, signos y mayúsculas del usuario", () => {
    expect(normalizeEmail("Juan.Perez+rifa14@gamil.com")).toBe("Juan.Perez+rifa14@gmail.com")
    expect(normalizeEmail("MARÍA_123@gmil.com")).toBe("MARÍA_123@gmail.com")
    expect(normalizeEmail("a.b.c@gmaim.com")).toBe("a.b.c@gmail.com")
  })

  it("saca espacios que se cuelan al copiar y pegar", () => {
    expect(normalizeEmail(" juan @ gmail.com ")).toBe("juan@gmail.com")
    expect(normalizeEmail("juan@gmail . com")).toBe("juan@gmail.com")
  })

  it("baja el dominio a minúsculas sin marcarlo como corrección", () => {
    const result = correctEmailDomain("Juan@GMAIL.COM")
    expect(result.email).toBe("Juan@gmail.com")
    expect(result.fix).toBeNull()
  })
})

describe("correctEmailDomain — entradas peligrosas", () => {
  it("devuelve igual lo que no se puede interpretar", () => {
    expect(normalizeEmail("")).toBe("")
    expect(normalizeEmail("juan")).toBe("juan")
    expect(normalizeEmail("@gmail.com")).toBe("@gmail.com")
    expect(normalizeEmail("juan@")).toBe("juan@")
  })

  it("usa el último @ cuando hay más de uno", () => {
    expect(normalizeEmail("juan@gmail.com@gamil.com")).toBe("juan@gmail.com@gmail.com")
  })

  it("reporta fix solo cuando cambió el dominio", () => {
    expect(correctEmailDomain("juan@gamil.com").fix).toBe("domain")
    expect(correctEmailDomain("juan@gmail.com").fix).toBeNull()
  })
})
