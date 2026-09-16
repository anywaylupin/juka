import type { AccountRecord, MergeResult, SessionResponse } from '#shared/types/auth';

/**
 * Who is signed in, and the two moments that change it.
 *
 * Signed out is a first class state, not a locked door: the whole app works without an account, against local storage.
 * An account is a place to put the cards so they survive a cleared browser and reach a second device.
 */
export function useSession() {
  const account = useState<AccountRecord | null>('juka:account', () => null);
  const ready = useState('juka:account-ready', () => false);

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

  async function register(input: { username: string; password: string; email?: string | null }) {
    account.value = await $fetch<AccountRecord>('/api/auth/register', { method: 'POST', body: input });
    return account.value;
  }

  async function login(input: { username: string; password: string }) {
    account.value = await $fetch<AccountRecord>('/api/auth/login', { method: 'POST', body: input });
    return account.value;
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    account.value = null;
  }

  async function updateProfile(input: { email?: string | null; password?: string; currentPassword?: string }) {
    account.value = await $fetch<AccountRecord>('/api/auth/profile', { method: 'PATCH', body: input });
    return account.value;
  }

  /** Preferences that are not identity: the rating names, for now. */
  async function updateSettings(input: { ratingLabels?: string[] | null }) {
    account.value = await $fetch<AccountRecord>('/api/auth/settings', { method: 'PATCH', body: input });
    return account.value;
  }

  /**
   * Copies local storage cards up to the account.
   * Additive: a word already on the account is skipped, and the local copy is never deleted by this.
   */
  async function mergeLocal(cards: unknown[]): Promise<MergeResult> {
    return $fetch<MergeResult>('/api/cards/merge', { method: 'POST', body: { cards } });
  }

  return { account, ready, signedIn, refresh, register, login, logout, updateProfile, updateSettings, mergeLocal };
}
