/**
 * Sign in with Google.
 *
 * The scopes are the two that describe a person rather than reach into their account: who they are, and the address they verified.
 * `email_verified` is checked before the address is trusted to match an existing account, because matching on an unverified address would let anyone with a Google account claim one here.
 */
export default defineOAuthGoogleEventHandler({
  config: { scope: ['openid', 'email', 'profile'] },

  async onSuccess(event, { user }) {
    const profile = user as { sub: string; email?: string; email_verified?: boolean; name?: string };

    await signInWithProvider(event, {
      provider: 'google',
      providerAccountId: profile.sub,
      email: profile.email_verified ? (profile.email ?? null) : null,
      suggestedUsername: profile.email?.split('@')[0] ?? profile.name ?? ''
    });

    return sendRedirect(event, '/?signedin=google');
  },

  onError(event, error) {
    console.error('[juka] Google sign-in failed', error);
    return sendRedirect(event, '/?autherror=google');
  }
});
