import { describe, expect, it } from "vitest"
import { getHomeHeadline } from "@/features/home/home-hero-copy"

describe("getHomeHeadline", () => {
  const siteInfo = { site_name: "Mi Rifa", tagline: "Gana hoy", runlot_id: "" }

  it("uses configured hero title when meaningful", () => {
    const hero = {
      title: "Gran sorteo",
      subtitle: "Solo esta semana",
      show_particles: false,
      how_to_play_label: "",
    }
    expect(getHomeHeadline(siteInfo, hero)).toEqual({
      headline: "Gran sorteo",
      subline: "Solo esta semana",
    })
  })

  it("falls back to site name for fragment titles", () => {
    const hero = { title: "¡GANA", subtitle: "", show_particles: false, how_to_play_label: "" }
    expect(getHomeHeadline(siteInfo, hero)).toEqual({
      headline: "Mi Rifa",
      subline: "Gana hoy",
    })
  })

  it("does not inject hardcoded marketing defaults", () => {
    const hero = { title: "", subtitle: "", show_particles: false, how_to_play_label: "" }
    expect(getHomeHeadline(siteInfo, hero)).toEqual({
      headline: "Mi Rifa",
      subline: "Gana hoy",
    })
    expect(getHomeHeadline(siteInfo, hero).subline).not.toMatch(/seguras en línea/)
  })
})
