import { DEFAULT_THEME, THEMES, type ThemeName } from '#shared/constants/themes'
import { normaliseRatingLabels } from '#shared/constants/rating'
import type { AccountRecord } from '#shared/types/auth'

export interface AccountRow {
  id: number
  username: string
  email: string | null
  theme: string
  ratingLabels: string | null
  createdAt: Date
}

/**
 * One place that decides the wire shape of an account.
 *
 * The password hash is not a field here, which is the point: a route cannot
 * leak it by forgetting to pick columns, because the only way to build the
 * response goes through this function.
 */
export function toAccount(row: AccountRow): AccountRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    // A theme that was removed from the list since it was chosen would
    // otherwise render as no theme at all.
    theme: THEMES.some(entry => entry.name === row.theme) ? row.theme as ThemeName : DEFAULT_THEME,
    // Stored as JSON text. Anything unparseable falls back to the defaults
    // rather than leaving the interface with nameless ratings.
    ratingLabels: normaliseRatingLabels(parseLabels(row.ratingLabels)),
    createdAt: row.createdAt.toISOString()
  }
}

function parseLabels(raw: string | null): unknown {
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  }
  catch {
    return null
  }
}
