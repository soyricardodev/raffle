import type { Plugin } from "vite"

const MODULE_ID = "tanstack-start-injected-head-scripts:v"
const RESOLVED_ID = `\0${MODULE_ID}`

/**
 * TanStack Start dev SSR imports this virtual module, but no installed plugin
 * currently registers it in our stack (devtools + nitro). Export empty scripts
 * until upstream wires the provider.
 */
export function injectedHeadScriptsStub(): Plugin {
  return {
    name: "raffle:injected-head-scripts-stub",
    enforce: "pre",
    resolveId(id) {
      if (id === MODULE_ID) return RESOLVED_ID
    },
    load(id) {
      if (id === RESOLVED_ID) {
        return "export const injectedHeadScripts = undefined"
      }
    },
  }
}
