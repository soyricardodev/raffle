export function purchaseSuccessFinalizeCopy(supportLabel: string) {
  const channel = supportLabel.trim() || "WhatsApp"
  return {
    eyebrow: "Compra registrada",
    title: `Escríbeme por ${channel} tu nombre y apellido`,
    description: "Así confirmamos tus datos y te tenemos registrado.",
    ctaLabel: `Escribir por ${channel}`,
    reminderTitle: `¿Ya me escribiste por ${channel}?`,
    reminderDescription: "Mándame tu nombre y apellido para confirmar tus datos.",
    reminderAction: "Escribir",
  }
}

export function purchaseSuccessRepeatCopy() {
  return {
    title: "Compra registrada",
    description: "Tus boletos ya están reservados.",
  }
}
