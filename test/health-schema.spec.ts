import { describe, expect, it } from 'vitest';
import { healthQuerySchema } from '../shared/schemas/health';

describe('health query schema', () => {
  it('defaults to probing everything', () => {
    expect(healthQuerySchema.parse({})).toEqual({ probe: 'all' });
  });

  it('accepts the three known probes', () => {
    for (const probe of ['all', 'db', 'r2'] as const) {
      expect(healthQuerySchema.parse({ probe })).toEqual({ probe });
    }
  });

  it('rejects anything else, so no unvalidated input reaches the database', () => {
    expect(() => healthQuerySchema.parse({ probe: 'bogus' })).toThrow();
  });
});
