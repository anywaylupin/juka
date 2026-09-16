import { describe, expect, it } from 'vitest';
import { loginSchema, profileUpdateSchema, registerSchema, usernameSchema } from '../shared/schemas/auth';

describe('usernameSchema', () => {
  it('lowercases, so Lupin and lupin are one account rather than two', () => {
    expect(usernameSchema.parse('Lupin')).toBe('lupin');
    expect(usernameSchema.parse('  LUPIN  ')).toBe('lupin');
  });

  it('accepts the punctuation people actually use in a handle', () => {
    for (const name of ['lupin', 'lu-pin', 'lu_pin', 'lu.pin', 'lupin2']) {
      expect(usernameSchema.parse(name)).toBe(name);
    }
  });

  it('rejects anything that would need escaping somewhere', () => {
    for (const name of ['lu pin', 'lu/pin', '<script>', 'lu@pin', 'lu#pin']) {
      expect(() => usernameSchema.parse(name)).toThrow();
    }
  });

  it('rejects a leading separator, so .. and -- are not usernames', () => {
    for (const name of ['.lupin', '-lupin', '_lupin']) {
      expect(() => usernameSchema.parse(name)).toThrow();
    }
  });

  it('has a floor and a ceiling', () => {
    expect(() => usernameSchema.parse('ab')).toThrow();
    expect(() => usernameSchema.parse('a'.repeat(33))).toThrow();
  });
});

describe('registerSchema', () => {
  it('treats an empty email as no email, because the field is optional', () => {
    expect(registerSchema.parse({ username: 'lupin', password: 'mandarin-box', email: '' }).email).toBeNull();
  });

  it('accepts a missing email entirely', () => {
    const parsed = registerSchema.parse({ username: 'lupin', password: 'mandarin-box' });
    expect(parsed.username).toBe('lupin');
  });

  it('still rejects an email that is present and malformed', () => {
    expect(() =>
      registerSchema.parse({ username: 'lupin', password: 'mandarin-box', email: 'not-an-email' })
    ).toThrow();
  });

  it('requires a password long enough to be worth hashing', () => {
    expect(() => registerSchema.parse({ username: 'lupin', password: 'short' })).toThrow();
  });
});

describe('loginSchema', () => {
  it('does not apply the length rule to an existing password', () => {
    /*
     * Deliberate: tightening the password rules must not lock out someone whose password was set under the old ones.
     * Only registration enforces length.
     */
    expect(loginSchema.parse({ username: 'lupin', password: 'old' }).password).toBe('old');
  });

  it('still rejects an empty password', () => {
    expect(() => loginSchema.parse({ username: 'lupin', password: '' })).toThrow();
  });
});

describe('profileUpdateSchema', () => {
  it('accepts an email-only change', () => {
    const parsed = profileUpdateSchema.parse({ email: 'me@example.com' });
    expect(parsed.email).toBe('me@example.com');
    expect(parsed.password).toBeUndefined();
  });

  it('lets the email be cleared back to nothing', () => {
    expect(profileUpdateSchema.parse({ email: '' }).email).toBeNull();
  });

  it('holds a new password to the full length rule', () => {
    expect(() => profileUpdateSchema.parse({ password: 'short', currentPassword: 'whatever' })).toThrow();
  });
});
