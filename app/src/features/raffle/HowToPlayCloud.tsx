import { ChevronRight, Play } from "lucide-react"
import {
  HOW_TO_PLAY_LABEL,
  HOW_TO_PLAY_REEL_HREF,
} from "@/features/raffle/how-to-play"

type HowToPlayCloudProps = {
  href?: string
}

export function HowToPlayCloud({ href = HOW_TO_PLAY_REEL_HREF }: HowToPlayCloudProps) {
  return (
    <section aria-label={HOW_TO_PLAY_LABEL}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="how-to-play-cloud"
        className="how-to-play-link bg-primary text-primary-foreground flex w-full items-center gap-2.5 rounded-lg border-0 px-3 py-2"
      >
        <span className="bg-primary-foreground/15 flex size-8 shrink-0 items-center justify-center rounded-md">
          <Play className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-center text-lg font-bold leading-none tracking-tight">
          {HOW_TO_PLAY_LABEL}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center" aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      </a>
    </section>
  )
}
