import { describe, expect, it } from 'vitest';
import { inSlices } from '../server/utils/db';

describe('inSlices', () => {
  it('never hands D1 more than 90 values, and loses none', async () => {
    const seen: number[] = [];
    const ids = Array.from({ length: 150 }, (_, index) => index);

    const result = await inSlices(ids, async (slice) => {
      seen.push(slice.length);
      return slice;
    });

    expect(Math.max(...seen)).toBeLessThanOrEqual(90);
    expect(result).toEqual(ids);
  });
});
