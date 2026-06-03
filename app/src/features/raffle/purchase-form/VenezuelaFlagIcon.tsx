import { cn } from "@/lib/utils"

type VenezuelaFlagIconProps = {
  className?: string
}

/** Tricolor Venezuela flag as inline SVG (no emoji, consistent across browsers). */
export function VenezuelaFlagIcon({ className }: VenezuelaFlagIconProps) {
  return (
    <svg
      viewBox="0 0 20 14"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn(
        "shrink-0 overflow-hidden rounded-[2px] shadow-sm ring-1 ring-black/10",
        className,
      )}
    >
      <rect width="20" height="4.67" fill="#FFCC00" />
      <rect y="4.67" width="20" height="4.67" fill="#00247D" />
      <rect y="9.33" width="20" height="4.67" fill="#CF142B" />
      <g fill="#FFFFFF">
        <circle cx="4" cy="7" r="0.55" />
        <circle cx="6.2" cy="6.1" r="0.55" />
        <circle cx="8.4" cy="5.6" r="0.55" />
        <circle cx="10.6" cy="5.6" r="0.55" />
        <circle cx="12.8" cy="6.1" r="0.55" />
        <circle cx="15" cy="6.6" r="0.55" />
        <circle cx="16.8" cy="7.4" r="0.55" />
        <circle cx="3" cy="7.8" r="0.55" />
      </g>
    </svg>
  )
}
