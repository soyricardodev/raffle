import { CheckCircleIcon, ImageIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react"
import { memo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

const MAX_MB = 5
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf"
const ACCEPTED_TYPES = new Set(ACCEPT.split(","))

type PaymentProofUploadProps = {
  file: File | null
  disabled?: boolean
  error?: string
  onChange: (file: File | null) => void
}

export const PaymentProofUpload = memo(function PaymentProofUpload({
  file,
  disabled,
  error,
  onChange,
}: PaymentProofUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const displayError = localError ?? error

  function selectFile(nextFile: File | null) {
    if (!nextFile) {
      setLocalError(null)
      onChange(null)
      return
    }

    if (!ACCEPTED_TYPES.has(nextFile.type)) {
      setLocalError("JPG, PNG, WEBP, GIF o PDF")
      onChange(null)
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    if (nextFile.size > MAX_MB * 1024 * 1024) {
      setLocalError(`Máx ${MAX_MB} MB`)
      onChange(null)
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    setLocalError(null)
    onChange(nextFile)
  }

  return (
    <Field data-invalid={!!displayError}>
      <FieldLabel htmlFor="payment-proof">Comprobante de pago</FieldLabel>
      <FieldDescription>
        Captura o foto clara del pago. JPG, PNG, WEBP, GIF o PDF · máx. {MAX_MB} MB
      </FieldDescription>
      <input
        id="payment-proof"
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        data-testid="payment-proof-input"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-invalid={!!displayError}
        className={cn(
          "flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 transition-colors",
          file
            ? "border-emerald-500/50 bg-emerald-500/15"
            : "border-emerald-500/35 bg-emerald-500/8 hover:border-emerald-500/55 hover:bg-emerald-500/12",
          displayError && "border-destructive",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {file ? (
          <>
            <CheckCircleIcon
              className="size-8 text-emerald-600 dark:text-emerald-400"
              weight="fill"
              aria-hidden
            />
            <span className="max-w-full truncate text-sm font-medium">{file.name}</span>
            <span className="text-muted-foreground text-xs">Toca para cambiar el archivo</span>
          </>
        ) : (
          <>
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <UploadSimpleIcon className="size-6" aria-hidden />
            </span>
            <span className="text-sm font-medium">Subir comprobante</span>
            <span className="text-muted-foreground text-center text-xs">
              Toca aquí para elegir desde tu galería
            </span>
          </>
        )}
      </button>
      {file ? (
        <div className="flex items-center gap-2">
          <ImageIcon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs"
            disabled={disabled}
            onClick={() => {
              selectFile(null)
              if (inputRef.current) inputRef.current.value = ""
            }}
          >
            <XIcon data-icon="inline-start" />
            Quitar archivo
          </Button>
        </div>
      ) : null}
      <p className="text-muted-foreground text-[10px] leading-snug">
        Tu comprobante se usa solo para validar el pago. No lo compartimos públicamente.
      </p>
      <FieldError>{displayError}</FieldError>
    </Field>
  )
})
