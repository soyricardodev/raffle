import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AdminImageUploadField } from "@/features/admin/shared/AdminImageUploadField"
import type { OfficialFooterLogo } from "@raffle/shared/site-config"
import { Plus, Trash2 } from "lucide-react"

type OfficialLogosEditorProps = {
  logos: OfficialFooterLogo[]
  onChange: (logos: OfficialFooterLogo[]) => void
}

export function OfficialLogosEditor({ logos, onChange }: OfficialLogosEditorProps) {
  function updateAt(index: number, patch: Partial<OfficialFooterLogo>) {
    onChange(logos.map((logo, i) => (i === index ? { ...logo, ...patch } : logo)))
  }

  function removeAt(index: number) {
    onChange(logos.filter((_, i) => i !== index))
  }

  function addLogo() {
    if (logos.length >= 8) return
    onChange([...logos, { image: "", alt: "" }])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Logos oficiales</p>
          <p className="text-muted-foreground text-xs">
            Avalados u organismos (máx. 8). Se muestran en el pie del sitio.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-9 shrink-0"
          disabled={logos.length >= 8}
          onClick={addLogo}
        >
          <Plus className="mr-1 size-4" />
          Agregar
        </Button>
      </div>

      {logos.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-xs">
          Sin logos oficiales. Usa Agregar para incluir loterías o sellos de aval.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {logos.map((logo, index) => (
            <li
              key={`official-logo-${index}`}
              className="border-border/80 flex flex-col gap-3 rounded-xl border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs font-medium">
                  Logo {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive size-9"
                  aria-label={`Eliminar logo ${index + 1}`}
                  onClick={() => removeAt(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <AdminImageUploadField
                id={`official-logo-${index}`}
                label="Imagen"
                description="PNG o SVG con fondo transparente."
                kind="site"
                value={logo.image || null}
                onChange={(url) => updateAt(index, { image: url ?? "" })}
              />
              <Field>
                <FieldLabel htmlFor={`official-logo-alt-${index}`}>Texto alternativo</FieldLabel>
                <Input
                  id={`official-logo-alt-${index}`}
                  className="min-h-10"
                  value={logo.alt}
                  placeholder="Ej. Lotería del Táchira"
                  onChange={(event) => updateAt(index, { alt: event.target.value })}
                />
                <FieldDescription>Accesibilidad y tooltip al pasar el cursor.</FieldDescription>
              </Field>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
