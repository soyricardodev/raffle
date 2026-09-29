/* @vitest-environment jsdom */
import { createElement, useState } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ConfirmAction } from "./ConfirmAction"

function ActionHarness({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false)

  return createElement(
    "div",
    null,
    createElement("button", { onClick: () => setOpen(true) }, "Ejecutar mutación"),
      createElement(ConfirmAction, {
        open,
        onOpenChange: setOpen,
        title: "Confirmar",
        description: "¿Continuar?",
        onConfirm,
      }),
  )
}

describe("ConfirmAction", () => {
  it("runs the mutation immediately without displaying a dialog", () => {
    const onConfirm = vi.fn()
    render(createElement(ActionHarness, { onConfirm }))

    fireEvent.click(screen.getByRole("button", { name: "Ejecutar mutación" }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alertdialog")).toBeNull()
  })
})
