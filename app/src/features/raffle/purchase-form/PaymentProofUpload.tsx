import { ImageIcon, UploadSimpleIcon, XIcon } from "@phosphor-icons/react"
import { memo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
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
      <FieldLabel htmlFor="payment-proof">Comprobante</FieldLabel>
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
          "flex h-16 w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3",
          displayError && "border-destructive",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {file ? (
          <>
            <ImageIcon className="text-primary shrink-0" />
            <span className="truncate text-sm">{file.name}</span>
          </>
        ) : (
          <>
            <UploadSimpleIcon className="text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-sm">Subir comprobante</span>
          </>
        )}
      </button>
      {file ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={disabled}
          onClick={() => {
            selectFile(null)
            if (inputRef.current) inputRef.current.value = ""
          }}
        >
          <XIcon data-icon="inline-start" />
          Quitar
        </Button>
      ) : null}
      <FieldError>{displayError}</FieldError>
    </Field>
  )
})
