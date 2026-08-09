import {
  CameraIcon,
  CheckCircleIcon,
  FilePdfIcon,
  ImagesIcon,
  XIcon,
} from "@phosphor-icons/react"
import { type ChangeEvent, memo, useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import {
  PAYMENT_PROOF_ACCEPT_ATTR,
  PAYMENT_PROOF_MAX_MB,
  validatePaymentProofFile,
} from "@/lib/payment-proof"
import { cn } from "@/lib/utils"

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
  const baseId = useId()
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const displayError = localError ?? error
  const galleryInputId = `${baseId}-gallery`

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function clearInputs() {
    if (galleryInputRef.current) galleryInputRef.current.value = ""
    if (cameraInputRef.current) cameraInputRef.current.value = ""
  }

  function clearFile() {
    setLocalError(null)
    onChange(null)
    clearInputs()
  }

  function selectFile(nextFile: File | null) {
    // Always reset so the same file can be picked again after a reject/success.
    clearInputs()

    if (!nextFile) {
      setLocalError(null)
      onChange(null)
      return
    }

    const result = validatePaymentProofFile(nextFile)
    if (!result.ok) {
      setLocalError(result.error)
      onChange(null)
      toast.error(result.error)
      return
    }

    setLocalError(null)
    onChange(result.file)
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null
    selectFile(next)
  }

  return (
    <Field data-invalid={!!displayError}>
      <FieldLabel htmlFor={galleryInputId}>Comprobante de pago</FieldLabel>
      <FieldDescription>
        Foto clara del pago (JPG, PNG, WEBP, GIF o PDF · máx. {PAYMENT_PROOF_MAX_MB} MB)
      </FieldDescription>

      <input
        id={galleryInputId}
        ref={galleryInputRef}
        type="file"
        accept={PAYMENT_PROOF_ACCEPT_ATTR}
        className="sr-only"
        disabled={disabled}
        data-testid="payment-proof-input"
        onChange={onInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        data-testid="payment-proof-camera-input"
        onChange={onInputChange}
      />

      {file ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 p-3",
            displayError && "border-destructive",
          )}
        >
          <div className="flex items-start gap-3">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Vista previa del comprobante"
                className="size-20 shrink-0 rounded-lg object-cover ring-1 ring-emerald-500/30"
              />
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <FilePdfIcon className="size-8" weight="duotone" aria-hidden />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                <CheckCircleIcon className="size-4 shrink-0" weight="fill" aria-hidden />
                Comprobante listo
              </p>
              <p className="truncate text-xs font-medium">{file.name}</p>
              <p className="text-muted-foreground text-[11px]">
                {(file.size / 1024).toFixed(0)} KB · puedes cambiarlo si hace falta
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-10"
              disabled={disabled}
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImagesIcon data-icon="inline-start" />
              Cambiar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10"
              disabled={disabled}
              onClick={clearFile}
            >
              <XIcon data-icon="inline-start" />
              Quitar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => galleryInputRef.current?.click()}
            aria-invalid={!!displayError}
            className={cn(
              "flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 transition-colors",
              "border-emerald-500/35 bg-emerald-500/8 hover:border-emerald-500/55 hover:bg-emerald-500/12",
              displayError && "border-destructive",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <ImagesIcon className="size-6" aria-hidden />
            </span>
            <span className="text-sm font-medium">Elegir de la galería</span>
            <span className="text-muted-foreground text-center text-xs">
              Captura de pantalla o foto guardada
            </span>
          </button>

          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
          >
            <CameraIcon data-icon="inline-start" />
            Tomar foto ahora
          </Button>
        </div>
      )}

      <p className="text-muted-foreground text-[10px] leading-snug">
        Si no carga: prueba «Tomar foto ahora», o en iPhone usa formato «Más compatible» (no HEIC).
      </p>
      <FieldError>{displayError}</FieldError>
    </Field>
  )
})
