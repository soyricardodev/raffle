import { DEFAULT_HOW_TO_PLAY_LABEL } from "@raffle/shared/site-config"

export const HOW_TO_PLAY_REEL_HREF =
  "https://www.instagram.com/reel/DZIuHCwpq1y/?igsi=NDNleXA3ZGdkbGNy"

export { DEFAULT_HOW_TO_PLAY_LABEL }

export function resolveHowToPlayLabel(raw: string | undefined | null): string {
  const trimmed = raw?.trim() ?? ""
  return trimmed || DEFAULT_HOW_TO_PLAY_LABEL
}

export function shouldShowHowToPlayCloud(status: string | undefined): boolean {
  return status === "active" || status === "paused"
}
