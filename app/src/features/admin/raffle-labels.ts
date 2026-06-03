export function raffleStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Activa",
    paused: "Pausada",
    finished: "Finalizada",
    draft: "Borrador",
  }
  return labels[status] ?? status
}
