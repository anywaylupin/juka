import type { D1Database, R2Bucket } from '@cloudflare/workers-types'

declare global {
  /**
   * Bindings declared in wrangler.jsonc. Kept in one place so a new binding is
   * added here and nowhere else.
   */
  interface JukaCloudflareEnv {
    DB: D1Database
    AUDIO: R2Bucket
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
