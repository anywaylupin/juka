/**
 * Sign in with GitHub.
 *
 * One route does both halves: with no code in the query it redirects to GitHub, and with one it exchanges it, reads the profile, and hands the result to signInWithProvider.
 * `emailRequired` makes the handler fetch the verified primary address when the public profile hides it, which is the common case and is what lets a GitHub sign-in land on an account that already exists.
 *
 * The access token is not stored. It is spent here and dropped: nothing in the app ever calls GitHub on the user's behalf.
 */
export default defineOAuthGitHubEventHandler({
  config: { emailRequired: true },

  async onSuccess(event, { user }) {
    const profile = user as { id: number; login?: string; name?: string; email?: string | null };

    await signInWithProvider(event, {
      provider: 'github',
      providerAccountId: String(profile.id),
      email: profile.email ?? null,
      suggestedUsername: profile.login ?? profile.name ?? ''
    });

    return sendRedirect(event, '/?signedin=github');
  },

  onError(event, error) {
    // The person is mid sign-in and cannot read a JSON error, so they go back to the app with something the interface can say out loud.
    console.error('[juka] GitHub sign-in failed', error);
    return sendRedirect(event, '/?autherror=github');
  }
});
