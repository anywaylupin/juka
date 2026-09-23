import { and, eq, sql } from 'drizzle-orm';
import type { H3Event } from 'h3';
import type { AuthProvider } from '#shared/types/auth';
import { oauthAccounts, users } from '../database/schema';

/**
 * Finding and making accounts, in one place because three routes and two OAuth callbacks all need the same answers.
 *
 * Sign-in accepts a username or an email address, so every lookup here takes whichever the person typed and decides which it is rather than making the caller ask.
 */

/** An address is not case sensitive in practice, and neither is a username here. */
function normalize(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/** The account for a username or an email address, or undefined. */
export async function findAccountByIdentifier(event: H3Event, identifier: string) {
  const db = useDrizzle(event);
  const value = normalize(identifier);

  // An address always contains one, and a username can never contain one, so this needs no guessing.
  const column = value.includes('@') ? users.email : users.username;
  const [account] = await db.select().from(users).where(eq(column, value));

  return account;
}

/** Providers already linked to an account, for the settings panel and the session route. */
export async function providersFor(event: H3Event, userId: number): Promise<AuthProvider[]> {
  const db = useDrizzle(event);
  const rows = await db
    .select({ provider: oauthAccounts.provider })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.userId, userId));

  return rows.map((row) => row.provider as AuthProvider);
}

/**
 * A username nobody else has, built from what the provider offered.
 *
 * A GitHub login or the local part of an address is almost always free and is what the person expects to see, so it is tried first and only then given a number.
 * Ten attempts is generous: the loop is bounded rather than clever, and the fallback is a name that cannot collide.
 */
export async function availableUsername(event: H3Event, suggestion: string): Promise<string> {
  const db = useDrizzle(event);
  const base =
    normalize(suggestion)
      .replaceAll(/[^a-z0-9._-]/g, '')
      .replace(/^[^a-z0-9]+/, '')
      .slice(0, 24) || 'learner';

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = attempt === 0 ? base.padEnd(3, '0') : `${base}${attempt + 1}`;
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate));

    if (!taken) {
      return candidate;
    }
  }

  return `learner${Date.now().toString(36)}`;
}

export interface ProviderProfile {
  provider: AuthProvider;
  /** The provider's own id, which stays put when the address and the display name do not. */
  providerAccountId: string;
  email: string | null;
  /** What the provider calls them, used only to suggest a username. */
  suggestedUsername: string;
}

/**
 * Turn a provider profile into a signed in session, in the order that surprises nobody.
 *
 * 1. Already linked: sign that account in. This is every visit after the first.
 * 2. Signed in already: link the provider to the account being used, so settings can offer both.
 * 3. An account with that address: link and sign in, because a person who signed up with an address and then clicked the Google button for the same address means one account, not two.
 * 4. Otherwise make an account with no password, a free username, and the address if there was one.
 *
 * Step three is the one with a judgement in it. It trusts the provider's address, which is safe for Google and for GitHub because both verify before they hand one over, and it is what keeps a box from quietly splitting in half.
 */
export async function signInWithProvider(event: H3Event, profile: ProviderProfile) {
  const db = useDrizzle(event);

  const [existingLink] = await db
    .select()
    .from(oauthAccounts)
    .where(
      and(eq(oauthAccounts.provider, profile.provider), eq(oauthAccounts.providerAccountId, profile.providerAccountId))
    );

  if (existingLink) {
    const [account] = await db.select().from(users).where(eq(users.id, existingLink.userId));

    if (account) {
      await setUserSession(event, { user: { id: account.id, username: account.username } });
      return account;
    }

    // The account went and the link outlived it, which a cascade should have prevented.
    await db.delete(oauthAccounts).where(eq(oauthAccounts.id, existingLink.id));
  }

  const current = await getCurrentUser(event);
  const email = profile.email ? normalize(profile.email) : null;

  const [matched] = current
    ? await db.select().from(users).where(eq(users.id, current.id))
    : email
      ? await db.select().from(users).where(eq(users.email, email))
      : [];

  const account =
    matched ??
    (
      await db
        .insert(users)
        .values({
          username: await availableUsername(event, profile.suggestedUsername || email?.split('@')[0] || 'learner'),
          passwordHash: null,
          email,
          theme: 'seville'
        })
        .returning()
    )[0];

  if (!account) {
    throw createError({ statusCode: 500, message: 'Account was not created' });
  }

  if (!matched) {
    await seedDefaultGroups(event, account.id);
  }

  await db.insert(oauthAccounts).values({
    userId: account.id,
    provider: profile.provider,
    providerAccountId: profile.providerAccountId,
    email
  });

  // An account that had no address gets the provider's, so a password reset has somewhere to go.
  if (!account.email && email) {
    await db
      .update(users)
      .set({ email })
      .where(and(eq(users.id, account.id), sql`${users.email} is null`))
      .catch(() => undefined);
  }

  await setUserSession(event, { user: { id: account.id, username: account.username } });

  return account;
}
