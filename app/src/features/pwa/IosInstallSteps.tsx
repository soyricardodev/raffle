import { Share, SquarePlus } from "lucide-react"

export function IosInstallSteps() {
  return (
    <ol className="flex flex-col gap-2.5">
      <li className="flex items-start gap-3">
        <span className="bg-foreground text-background mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
          1
        </span>
        <span className="text-sm leading-snug">
          Toca <Share className="mx-0.5 inline size-4 align-text-bottom" aria-hidden />{" "}
          <strong>Compartir</strong> abajo en Safari
        </span>
      </li>
      <li className="flex items-start gap-3">
        <span className="bg-foreground text-background mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
          2
        </span>
        <span className="text-sm leading-snug">
          Elige <SquarePlus className="mx-0.5 inline size-4 align-text-bottom" aria-hidden />{" "}
          <strong>Agregar a pantalla de inicio</strong>
        </span>
      </li>
      <li className="flex items-start gap-3">
        <span className="bg-foreground text-background mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
          3
        </span>
        <span className="text-sm leading-snug">
          Abre el icono y toca <strong>Activar</strong>
        </span>
      </li>
    </ol>
  )
}
