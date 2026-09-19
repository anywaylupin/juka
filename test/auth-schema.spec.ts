import { describe, expect, it } from 'vitest';
import {
  loginSchema,
  passwordResetSchema,
  profileUpdateSchema,
  registerSchema,
  usernameSchema
} from '../shared/schemas/auth';

describe('usernameSchema', () => {
  it('lowercases, so one person cannot have two accounts one shift key apart', () => {
    expect(usernameSchema.parse('  Lupin  ')).toBe('lupin');
  });

  it('rejects a name that starts with punctuation', () => {
    expect(usernameSchema.safeParse('.lupin').success).toBe(false);
  });

  it('rejects anything shorter than three characters', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts a matching pair of passwords', () => {
    const parsed = registerSchema.parse({
      username: 'Mei',
      password: 'mandarin1',
      confirmPassword: 'mandarin1',
      email: 'Mei@Example.com'
    });

    expect(parsed.username).toBe('mei');
    expect(parsed.email).toBe('mei@example.com');
  });

  it('refuses two passwords that do not match, on the field that is wrong', () => {
    const result = registerSchema.safeParse({
      username: 'mei',
      password: 'mandarin1',
      confirmPassword: 'mandarin2'
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });

  it('treats a blank email as no email rather than as an invalid one', () => {
    expect(
      registerSchema.parse({ username: 'mei', password: 'mandarin1', confirmPassword: 'mandarin1', email: '' }).email
    ).toBeNull();
  });

  it('leaves the email out entirely when the field is absent', () => {
    expect(
      registerSchema.parse({ username: 'mei', password: 'mandarin1', confirmPassword: 'mandarin1' }).email
    ).toBeUndefined();
  });
});

describe('loginSchema', () => {
  it('takes a username or an email in the same field', () => {
    expect(loginSchema.parse({ identifier: 'MEI', password: 'x' }).identifier).toBe('mei');
    expect(loginSchema.parse({ identifier: 'Mei@Example.com', password: 'x' }).identifier).toBe('mei@example.com');
  });

  it('does not hold an old password to the current rules, which would lock people out', () => {
    expect(loginSchema.safeParse({ identifier: 'mei', password: 'short' }).success).toBe(true);
  });
});

describe('profileUpdateSchema', () => {
  /*
   * The regression that prompted this one: `.optional()` wrapped inside the transform made a missing email field parse as null, so renaming an account deleted its address.
   */
  it('leaves an absent email absent rather than turning it into null', () => {
    expect(profileUpdateSchema.parse({ username: 'lannie' }).email).toBeUndefined();
  });

  it('reads an explicitly blank email as clearing the address', () => {
    expect(profileUpdateSchema.parse({ email: '' }).email).toBeNull();
  });

  it('still checks the two passwords against each other', () => {
    expect(profileUpdateSchema.safeParse({ password: 'mandarin1', confirmPassword: 'mandarin2' }).success).toBe(false);
  });

  it('accepts a change with no password in it at all', () => {
    expect(profileUpdateSchema.safeParse({ username: 'lannie', email: 'lan@example.com' }).success).toBe(true);
  });
});

describe('passwordResetSchema', () => {
  it('needs a token long enough to be one', () => {
    expect(
      passwordResetSchema.safeParse({ token: 'abc', password: 'mandarin1', confirmPassword: 'mandarin1' }).success
    ).toBe(false);
  });

  it('accepts a real token with a matching pair', () => {
    expect(
      passwordResetSchema.safeParse({
        token: 'a'.repeat(64),
        password: 'mandarin1',
        confirmPassword: 'mandarin1'
      }).success
    ).toBe(true);
  });
});
