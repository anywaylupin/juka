import type { ThemeName } from '../constants/themes';

/** What the client is told about the signed in account. Never the hash. */
export interface AccountRecord {
  id: number;
  username: string;
  email: string | null;
  theme: ThemeName;
  /** The five rating names, always six entries with a blank at position zero. */
  ratingLabels: string[];
  createdAt: string;
}

export interface SessionResponse {
  account: AccountRecord | null;
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
