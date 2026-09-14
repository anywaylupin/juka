import type { Ai } from '@cloudflare/workers-types'
import type { H3Event } from 'h3'

/**
 * Only place in the codebase that touches the raw Workers AI binding, matching
 * useDrizzle and useAudioBucket.
 *
 * Unlike those two, the absence of this binding is not worth failing a request
 * over. It powers one convenience, translating a card's meaning into
 * Vietnamese, so callers reach for tryWorkersAi and carry on when it is null.
 */
export function tryWorkersAi(event: H3Event): Ai | null {
  return event.context.cloudflare?.env?.AI ?? null
}
