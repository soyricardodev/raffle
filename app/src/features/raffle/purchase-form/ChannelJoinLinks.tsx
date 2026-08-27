import type { BroadcastChannelLink } from "@/features/layout/social-links"
import { cn } from "@/lib/utils"

type ChannelJoinLinksProps = {
  links: BroadcastChannelLink[]
  className?: string
}

export function ChannelJoinLinks({ links, className }: ChannelJoinLinksProps) {
  if (links.length === 0) return null

  return (
    <nav aria-label="Canales oficiales" className={cn("flex flex-col gap-2", className)}>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 transition-[transform,background-color] duration-160 ease-out active:scale-[0.97] focus-visible:ring-3"
          style={{ backgroundColor: `${link.brandColor}14` }}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            style={{ backgroundColor: link.brandColor }}
            aria-hidden
          >
            <img
              src={link.iconSrc}
              alt=""
              className="size-5 brightness-0 invert"
              width={20}
              height={20}
            />
          </span>
          <span className="text-sm font-semibold leading-snug">{link.label}</span>
        </a>
      ))}
    </nav>
  )
}
