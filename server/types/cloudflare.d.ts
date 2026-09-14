import type { Ai, D1Database, R2Bucket } from '@cloudflare/workers-types'

declare global {
  /**
   * Bindings declared in wrangler.jsonc. Kept in one place so a new binding is
   * added here and nowhere else.
   */
  interface JukaCloudflareEnv {
    DB: D1Database
    AUDIO: R2Bucket
    /**
     * Optional on purpose. Workers AI has no local emulation, so the binding is
     * absent during `pnpm dev` and every caller treats translation as best
     * effort: no binding means the English meaning simply stands.
     */
    AI?: Ai
  }
}

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      env: JukaCloudflareEnv
      context: {
        waitUntil: (promise: Promise<unknown>) => void
        passThroughOnException: () => void
      }
      request: Request
    }
  }
}

export {}
