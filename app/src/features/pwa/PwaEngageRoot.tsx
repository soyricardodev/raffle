import { InAppBrowserGate } from "@/features/pwa/InAppBrowserGate"
import { IosInstallGuide } from "@/features/pwa/IosInstallGuide"
import { PwaEngageBanner } from "@/features/pwa/PwaEngageBanner"
import { PwaEngageSheet } from "@/features/pwa/PwaEngageSheet"
import { usePwaEngageContext } from "@/features/pwa/pwa-engage-context"

export function PwaEngageRoot() {
  const engage = usePwaEngageContext()
  if (!engage) return <InAppBrowserGate />

  return (
    <>
      <InAppBrowserGate />
      <PwaEngageSheet engage={engage} />
      <IosInstallGuide engage={engage} />
      <PwaEngageBanner engage={engage} />
    </>
  )
}
