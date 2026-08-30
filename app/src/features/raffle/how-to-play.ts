export const HOW_TO_PLAY_REEL_HREF =
  "https://www.instagram.com/reel/DZIuHCwpq1y/?igsi=NDNleXA3ZGdkbGNy"

export const HOW_TO_PLAY_LABEL = "Mira aquí cómo se juega"

export function shouldShowHowToPlayCloud(status: string | undefined): boolean {
  return status === "active" || status === "paused"
}
