import type { AuthProvider, ProvidersResponse } from '#shared/types/auth';

/**
 * Which providers this deployment can actually sign someone in with.
 *
 * A provider needs a client id and a secret, and a button for one that has neither fails with a 500 the moment it is pressed, so the interface asks first and renders only what will work.
 * That also means a fork with no OAuth configured shows a plain username and password form rather than three dead buttons.
 */
export default defineEventHandler((event): ProvidersResponse => {
  const oauth = useRuntimeConfig(event).oauth as
    Record<string, { clientId?: string; clientSecret?: string } | undefined> | undefined;

  const configured = (['github', 'google'] as const).filter((provider) => {
    const entry = oauth?.[provider];
    return Boolean(entry?.clientId && entry?.clientSecret);
  });

  return { providers: configured as AuthProvider[] };
});
