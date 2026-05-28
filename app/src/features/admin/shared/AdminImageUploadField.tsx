import { useMutation } from "@tanstack/react-query"
import { ImageIcon, SpinnerGap, Trash, UploadSimple } from "@phosphor-icons/react"
import { useRef } from "react"
import { toast } from "sonner"
export type AdminImageKind = "raffles" | "prizes"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { adminUpload } from "@/lib/admin-fetch"
import { cn } from "@/lib/utils"

type AdminImageUploadFieldProps = {
  id: string
  label: string
  description?: string
  kind: AdminImageKind
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

export function AdminImageUploadField({
  id,
  label,
  description,
  kind,
  value,
  onChange,
  disabled = false,
}: AdminImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append("file", file)
      form.append("kind", kind)
      return adminUpload<{ url: string }>("/api/admin/upload", form)
    },
    onSuccess: (result) => {
      onChange(result.url)
      toast.success("Imagen subida")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function handleFileChange(file: File | undefined) {
    if (!file) return
    uploadMutation.mutate(file)
  }

  const busy = uploadMutation.isPending

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-dashed p-4",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {value ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <img
              src={value}
              alt=""
              className="aspect-video w-full max-w-xs rounded-lg object-cover"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={busy || disabled}
                onClick={() => inputRef.current?.click()}
              >
                <UploadSimple data-icon="inline-start" />
                Reemplazar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={busy || disabled}
                onClick={() => onChange(null)}
              >
                <Trash data-icon="inline-start" />
                Quitar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy || disabled}
            onClick={() => inputRef.current?.click()}
            className="bg-muted/30 hover:bg-muted/50 flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg transition-colors"
          >
            {busy ? (
              <SpinnerGap className="size-8 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {busy ? "Subiendo…" : "Toca para subir imagen"}
            </span>
            <span className="text-muted-foreground text-xs">JPG, PNG, WEBP o GIF · máx. 5 MB</span>
          </button>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={busy || disabled}
          onChange={(event) => {
            handleFileChange(event.target.files?.[0])
            event.target.value = ""
          }}
        />
      </div>
    </Field>
  )
}
