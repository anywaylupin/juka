import type { H3Event } from 'h3';

/**
 * The one email this app sends: a password reset link.
 *
 * Sending is behind an API key, and without one the link is written to the server log instead of thrown away.
 * That is deliberate rather than a stub: in development there is no mail provider and the link still has to be usable, and in production a missing key has to be visible in the logs rather than silently swallowing every reset request.
 *
 * Resend is the provider because its free tier is enough for one person's flashcard box, it needs no domain to test with, and it is one HTTPS call rather than an SDK.
 * Set NUXT_RESEND_API_KEY and NUXT_MAIL_FROM to turn it on.
 */

export interface ResetMail {
  to: string;
  /** The full link, token and all. */
  url: string;
  /** Who it is for, so the message is addressed to a person rather than to an inbox. */
  username: string;
}

/** True when the message went to a provider, false when it went to the log. */
export async function sendPasswordReset(event: H3Event, mail: ResetMail): Promise<boolean> {
  const config = useRuntimeConfig(event);
  const apiKey = config.resendApiKey;
  const from = config.mailFrom;

  if (!apiKey || !from) {
    console.info(`[juka] password reset for ${mail.username}: ${mail.url}`);
    return false;
  }

  try {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        from,
        to: mail.to,
        subject: 'Reset your Juka password',
        text: [
          `Hello ${mail.username},`,
          '',
          'Open this link to choose a new password. It works once and expires in an hour.',
          '',
          mail.url,
          '',
          'If you did not ask for this, nothing has changed and you can ignore this message.'
        ].join('\n')
      }
    });

    return true;
  } catch (error) {
    // A failed send must not tell the caller whether the address exists, so it is logged here and the route answers the same either way.
    console.error('[juka] password reset send failed', error);
    return false;
  }
}
