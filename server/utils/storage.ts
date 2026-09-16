import type { R2Bucket } from '@cloudflare/workers-types';
import type { H3Event } from 'h3';

/**
 * Only place in the codebase that touches the raw R2 binding.
 * Audio objects are keyed by content hash, so the bucket is shared across users by design.
 */
export function useAudioBucket(event: H3Event): R2Bucket {
  const binding = event.context.cloudflare?.env?.AUDIO;

  if (!binding) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Object storage unavailable',
      message: 'R2 binding AUDIO is missing. Check r2_buckets in wrangler.jsonc.'
    });
  }

  return binding;
}
