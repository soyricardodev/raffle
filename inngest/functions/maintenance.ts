/**
 * Inngest function (referencia) — ejecutar mantenimiento periódico.
 * Alternativa: cron externo → POST /api/cron/maintenance con header x-cron-secret.
 */
export const maintenanceCronSchedule = "*/5 * * * *"

export const maintenanceJobDescription = {
  name: "raffle/maintenance",
  schedule: maintenanceCronSchedule,
  tasks: ["processPausedRaffles", "finalizeExpiredRaffles"],
}
