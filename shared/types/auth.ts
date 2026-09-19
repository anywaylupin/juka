import type { ThemeName } from '../constants/themes';

/** A provider that can sign someone in, as the app names it in routes and in the interface. */
export type AuthProvider = 'github' | 'google';

/** What the client is told about the signed in account. Never the hash. */
export interface AccountRecord {
  id: number;
  username: string;
  email: string | null;
  theme: ThemeName;
  /** The five rating names, always six entries with a blank at position zero. */
  ratingLabels: string[];
  /**
   * Whether this account has a password at all.
   *
   * An account made through GitHub or Google has none until someone sets one, and the interface has to know: it asks for the current password before changing it, and there is no current password to ask for.
   */
  hasPassword: boolean;
  /** Providers already linked to this account, so settings can offer to unlink them. */
  providers: AuthProvider[];
  createdAt: string;
}

export interface SessionResponse {
  account: AccountRecord | null;
}

/**
 * Which providers this deployment can actually use.
 *
 * A provider needs a client id and a secret, and a button for one that has neither is a button that fails, so the interface asks first and shows only what will work.
 */
export interface ProvidersResponse {
  providers: AuthProvider[];
}

/** Result of copying local storage cards up to an account on sign-in. */
export interface MergeResult {
  /** Cards written to the account. */
  added: number;
  /** Skipped because that word was already filed. */
  skipped: number;
  /** Rejected by validation, which should be none, but is reported honestly. */
  failed: number;
}
