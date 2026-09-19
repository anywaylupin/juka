import type { AccountRecord, AuthProvider, MergeResult, ProvidersResponse, SessionResponse } from '#shared/types/auth';

/**
 * Who is signed in, and every moment that changes it.
 *
 * Signed out is a first class state, not a locked door: the whole app works without an account, against local storage.
 * An account is a place to put the cards so they survive a cleared browser and reach a second device.
 */
export function useSession() {
  const account = useState<AccountRecord | null>('juka:account', () => null);
  const ready = useState('juka:account-ready', () => false);
  /**
   * Providers this deployment can actually use, asked once.
   *
   * A button for a provider with no client id fails the moment it is pressed, so the panel renders what will work and nothing else.
   */
  const providers = useState<AuthProvider[]>('juka:providers', () => []);

  const signedIn = computed(() => account.value !== null);

  async function refresh() {
    try {
      const { account: current } = await $fetch<SessionResponse>('/api/auth/session');
      account.value = current;
    } catch {
      // An unreachable session route means signed out, not broken.
      // The app falls back to local storage and keeps working.
      account.value = null;
    } finally {
      ready.value = true;
    }
  }

  async function loadProviders() {
    try {
      const response = await $fetch<ProvidersResponse>('/api/auth/providers');
      providers.value = response.providers;
    } catch {
      providers.value = [];
    }
  }

  async function register(input: {
    username: string;
    password: string;
    confirmPassword: string;
    email?: string | null;
  }) {
    account.value = await $fetch<AccountRecord>('/api/auth/register', { method: 'POST', body: input });
    return account.value;
  }

  /** The identifier is a username or an email address; the route works out which. */
  async function login(input: { identifier: string; password: string }) {
    account.value = await $fetch<AccountRecord>('/api/auth/login', { method: 'POST', body: input });
    return account.value;
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    account.value = null;
  }

  /** Any part of the account, one field or all of them. */
  async function updateProfile(input: {
    username?: string;
    email?: string | null;
    password?: string;
    confirmPassword?: string;
    currentPassword?: string;
  }) {
    account.value = await $fetch<AccountRecord>('/api/auth/profile', { method: 'PATCH', body: input });
    return account.value;
  }

  /** Preferences that are not identity: the rating names, for now. */
  async function updateSettings(input: { ratingLabels?: string[] | null }) {
    account.value = await $fetch<AccountRecord>('/api/auth/settings', { method: 'PATCH', body: input });
    return account.value;
  }

  /**
   * Ask for a reset link.
   * It resolves the same way whether or not the account exists, because the answer must not say.
   */
  async function requestReset(identifier: string) {
    await $fetch('/api/auth/forgot', { method: 'POST', body: { identifier } });
  }

  /** Spend a reset link. The route signs the person in, so the session is refreshed from the answer. */
  async function resetPassword(input: { token: string; password: string; confirmPassword: string }) {
    account.value = await $fetch<AccountRecord>('/api/auth/reset', { method: 'POST', body: input });
    return account.value;
  }

  async function unlinkProvider(provider: AuthProvider) {
    account.value = await $fetch<AccountRecord>('/api/auth/unlink', { method: 'POST', body: { provider } });
    return account.value;
  }

  /**
   * Copies local storage cards up to the account.
   * Additive: a word already on the account is skipped, and the local copy is never deleted by this.
   */
  async function mergeLocal(cards: unknown[]): Promise<MergeResult> {
    return $fetch<MergeResult>('/api/cards/merge', { method: 'POST', body: { cards } });
  }

  return {
    account,
    ready,
    signedIn,
    providers,
    refresh,
    loadProviders,
    register,
    login,
    logout,
    updateProfile,
    updateSettings,
    requestReset,
    resetPassword,
    unlinkProvider,
    mergeLocal
  };
}
