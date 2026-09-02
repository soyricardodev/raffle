import type { AnyRouteMatch } from "@tanstack/react-router"
import type { PublicSiteConfigPayload } from "@/features/layout/public-queries"
import { resolvePublicSeo } from "@/features/layout/public-seo"
import { PWA_NAME } from "@/features/pwa/pwa-brand"

export type SiteLayoutLoaderData = {
  siteConfig: PublicSiteConfigPayload | null
  siteName: string
}

export type DocumentHeadMeta =
  | { title?: string }
  | { name: string; content: string }
  | { property: string; content: string }

export type DocumentHeadResult = {
  meta?: DocumentHeadMeta[]
}

export function composeDocumentTitle(pageTitle: string, siteName?: string): string {
  const page = pageTitle.trim()
  const site = siteName?.trim() ?? ""
  if (!page) return site || PWA_NAME
  if (!site || page === site) return page
  return `${page} · ${site}`
}

export function siteNameFromMatches(
  matches: AnyRouteMatch[],
  layoutRouteId: "/_public" | "/admin",
): string {
  const data = layoutLoaderDataFromMatches(matches, layoutRouteId)
  if (data?.siteName.trim()) return data.siteName.trim()
  if (layoutRouteId === "/_public") return PWA_NAME
  if (data?.siteConfig) return resolvePublicSeo(data.siteConfig).title
  return ""
}

export function siteConfigFromMatches(
  matches: AnyRouteMatch[],
  layoutRouteId: "/_public" | "/admin",
): PublicSiteConfigPayload | null | undefined {
  return layoutLoaderDataFromMatches(matches, layoutRouteId)?.siteConfig
}

function layoutLoaderDataFromMatches(
  matches: AnyRouteMatch[],
  layoutRouteId: "/_public" | "/admin",
): SiteLayoutLoaderData | undefined {
  const match = matches.find((m) => m.routeId === layoutRouteId)
  return match?.loaderData as SiteLayoutLoaderData | undefined
}

type BuildPageHeadInput = {
  pageTitle: string
  siteName?: string
  description?: string
  ogTitle?: string
  robots?: string
  extraMeta?: DocumentHeadMeta[]
}

export function buildPageHead({
  pageTitle,
  siteName,
  description,
  ogTitle,
  robots,
  extraMeta = [],
}: BuildPageHeadInput): DocumentHeadResult {
  const documentTitle = composeDocumentTitle(pageTitle, siteName)
  const socialTitle = ogTitle ?? documentTitle
  const meta: DocumentHeadMeta[] = [{ title: documentTitle }, ...extraMeta]

  if (description) {
    meta.push({ name: "description", content: description })
    meta.push({ property: "og:description", content: description })
    meta.push({ name: "twitter:description", content: description })
  }

  if (robots) {
    meta.push({ name: "robots", content: robots })
  }

  meta.push({ property: "og:title", content: socialTitle })
  meta.push({ name: "twitter:title", content: socialTitle })

  return { meta }
}

export function buildPublicPageHead(
  input: Omit<BuildPageHeadInput, "siteName" | "description"> & {
    matches: AnyRouteMatch[]
    siteName?: string
    description?: string
  },
): DocumentHeadResult {
  const siteName = input.siteName ?? siteNameFromMatches(input.matches, "/_public")
  const siteConfig = siteConfigFromMatches(input.matches, "/_public")
  const defaultSeo = resolvePublicSeo(siteConfig)
  const description = input.description ?? defaultSeo.description

  return buildPageHead({ ...input, siteName, description })
}

export function buildAdminPageHead(
  pageTitle: string,
  matches: AnyRouteMatch[],
  options?: { description?: string; extraMeta?: DocumentHeadMeta[] },
): DocumentHeadResult {
  const siteName = siteNameFromMatches(matches, "/admin")
  return buildPageHead({
    pageTitle,
    siteName,
    description: options?.description,
    robots: "noindex, nofollow",
    extraMeta: options?.extraMeta,
  })
}

/** Cross-cutting admin meta only — leaf routes own the document title. */
export function buildAdminLayoutHead(): DocumentHeadResult {
  return { meta: [{ name: "robots", content: "noindex, nofollow" }] }
}

export function publicLayoutLoaderData(
  siteConfig: PublicSiteConfigPayload | null,
): SiteLayoutLoaderData {
  return { siteConfig, siteName: PWA_NAME }
}

export function adminLayoutLoaderData(siteConfig: PublicSiteConfigPayload | null): SiteLayoutLoaderData {
  const siteName = siteConfig?.site_info?.site_name?.trim() || PWA_NAME
  return { siteConfig, siteName }
}
