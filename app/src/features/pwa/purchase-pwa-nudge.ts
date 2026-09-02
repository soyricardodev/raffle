export type PurchasePwaNudgeKind = "install" | "ios-install" | "notify" | null

export function resolvePurchasePwaNudge(input: {
  standalone: boolean
  notifyComplete: boolean
  canOfferInstall: boolean
  canNotifyHere: boolean
  needsIosInstall: boolean
}): PurchasePwaNudgeKind {
  if (input.standalone && input.notifyComplete) return null
  if (input.canOfferInstall) return input.needsIosInstall ? "ios-install" : "install"
  if (input.canNotifyHere && !input.notifyComplete) return "notify"
  return null
}
