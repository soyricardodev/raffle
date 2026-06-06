export function requestPurchaseApprove({
  skipConfirm,
  onApprove,
  openConfirm,
}: {
  skipConfirm: boolean
  onApprove: () => void
  openConfirm: () => void
}) {
  if (skipConfirm) {
    onApprove()
    return
  }
  openConfirm()
}

export function requestPurchaseTicketAction({
  skipConfirm,
  onAction,
  openConfirm,
}: {
  skipConfirm: boolean
  onAction: () => void
  openConfirm: () => void
}) {
  if (skipConfirm) {
    onAction()
    return
  }
  openConfirm()
}
