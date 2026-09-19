import { eq } from 'drizzle-orm';
import { passwordResetRequestSchema } from '#shared/schemas/auth';
import { passwordResets } from '../../database/schema';

/**
 * Ask for a reset link.
 *
 * The answer is 204 whatever happens: whether the account exists, whether it has an address, whether the provider accepted the message.
 * Anything else turns this route into a way to ask "does this person have an account here", which is exactly what a password reset form must not answer.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, passwordResetRequestSchema.parse);
  const account = await findAccountByIdentifier(event, input.identifier);

  if (account?.email) {
    const db = useDrizzle(event);

    // Asking twice invalidates the first link rather than leaving two live.
    await db.delete(passwordResets).where(eq(passwordResets.userId, account.id));

    const token = createResetToken();

    await db.insert(passwordResets).values({
      userId: account.id,
      tokenHash: await hashResetToken(token),
      expiresAt: new Date(Date.now() + RESET_LIFETIME)
    });

    await sendPasswordReset(event, {
      to: account.email,
      username: account.username,
      url: resetUrl(event, token)
    });
  }

  setResponseStatus(event, 204);
  return null;
});
